import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { SignJWT } from "jose";
import {
  archive,
  homeSummary,
  mapSummary,
  park,
  trip,
  visits,
} from "../src/test/fixtures/public-cache.mts";

// This check owns its loopback servers and uses synthetic data/credentials only.
const cwd = fileURLToPath(new URL("..", import.meta.url));
const origin = "http://localhost:4399";
const apiPrefix = `/${randomUUID()}`;
const secret = "fixture-auth-secret-at-least-32-characters";
const environment = {
  ...process.env,
  NEXT_PUBLIC_API_URL: `http://127.0.0.1:4398${apiPrefix}`,
  NEXT_PUBLIC_SITE_URL: origin,
  API_KEY: "fixture-api-key",
  AUTH_JWT_SECRET: secret,
  AUTH_COOKIE_NAME: "__session",
  AUTH_JWT_ISSUER: "reissuvihko-api",
  AUTH_JWT_AUDIENCE: "reissuvihko-ui",
};
const counts = new Map();
let revision = 1;
let failMap = false;
let withdrawn = false;
let additionalTrip = false;
let recoveringPark = false;
const fixture = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const path = url.pathname.slice(apiPrefix.length);
  counts.set(path, (counts.get(path) ?? 0) + 1);
  let status = 200;
  let body;
  if (path === "/api/map-summary") {
    status = failMap ? 503 : 200;
    body = failMap ? { error: "Fixture temporarily unavailable" } : mapSummary(revision);
  } else if (path === "/api/home-summary") body = homeSummary(revision);
  else if (path === "/api/trips/archive") {
    body = archive(revision);
    if (additionalTrip)
      body = {
        ...body,
        trips: [...body.trips, { ...body.trips[0], id: 2, slug: "new-trip" }],
        total: 2,
      };
  } else if (path === "/api/trips/slug/fixture-trip")
    body = { ...trip, name: `Testiretki ${revision}` };
  else if (path === "/api/parks/recovering-park") {
    status = recoveringPark ? 200 : 503;
    body = recoveringPark
      ? { ...park, slug: "recovering-park" }
      : { error: "Fixture temporarily unavailable" };
  } else if (path === "/api/parks/recovering-park/visits") body = visits;
  else if (path === "/api/parks/fixture-park" && !withdrawn)
    body = { ...park, name: `Testipuisto ${revision}` };
  else if (path === "/api/parks/fixture-park/visits" && !withdrawn) body = visits;
  else if (path === "/api/parks/hidden-park" || path === "/api/parks/hidden-park/visits") {
    if (!request.headers.cookie?.includes("__session=")) {
      status = 404;
      body = { error: "Not found" };
    } else
      body = path.endsWith("/visits")
        ? visits
        : { ...park, slug: "hidden-park", name: "SALAINEN PUISTO" };
  } else {
    status = 404;
    body = { error: "Not found" };
  }
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
  });
  response.end(JSON.stringify(body));
});

const logs = [];
let child;
let browser;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const start = (args) => {
  child = spawn(process.execPath, args, {
    cwd,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => logs.push(data.toString()));
  child.stderr.on("data", (data) => logs.push(data.toString()));
  return child;
};
const get = async (path, headers) => {
  const response = await fetch(`${origin}${path}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  return { response, body: await response.text() };
};
const cached = async (path, expected) => {
  const first = await get(path);
  assert.equal(first.response.status, 200, path);
  if (expected) assert(first.body.includes(expected), `${path}: expected current content`);
  const snapshot = JSON.stringify([...counts]);
  const second = await get(path);
  assert.equal(second.response.headers.get("x-nextjs-cache"), "HIT", `${path}: rendered cache hit`);
  assert.equal(JSON.stringify([...counts]), snapshot, `${path}: no repeated API work`);
  return second;
};

try {
  {
    // No API server is listening during the build.
    const build = start(["node_modules/next/dist/bin/next", "build", "--webpack"]);
    const [code] = await once(build, "exit");
    child = undefined;
    assert.equal(code, 0, "Production build must succeed without the API");
  }
  const manifest = JSON.parse(
    await readFile(new URL("../.next/prerender-manifest.json", import.meta.url), "utf8"),
  );
  for (const path of [
    "/[[...path]]",
    "/paikat/[[...path]]",
    "/retket/[[...path]]",
    "/paikka/[slug]",
    "/retki/[slug]",
    "/sitemap.xml/[[...path]]",
  ]) {
    assert(path in manifest.dynamicRoutes, `${path}: on-demand generation`);
  }
  for (const file of [
    "icon-32x32.png",
    "apple-touch-icon.png",
    "icon-192x192.png",
    "icon-512x512.png",
  ]) {
    assert(`/icons/${file}` in manifest.routes, `${file}: generated during build`);
  }
  console.log("PASS build-independent public generation and static icons");

  await new Promise((resolve, reject) =>
    fixture.listen(4398, "127.0.0.1", resolve).once("error", reject),
  );
  start(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "4399"]);
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await get("/robots.txt");
      ready = true;
      break;
    } catch {
      await pause(100);
    }
  }
  assert(ready, "Temporary production UI must start");

  const token = await new SignJWT({
    email: "fixture@example.com",
    name: "Testaaja",
    picture: "",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fixture")
    .setIssuer("reissuvihko-api")
    .setAudience("reissuvihko-ui")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  const invalidate = async (expireImmediately = true, parkSlug = park.slug) => {
    const response = await fetch(`${origin}/api/revalidate-public-cache`, {
      method: "POST",
      headers: { cookie: `__session=${token}`, origin, "Content-Type": "application/json" },
      body: JSON.stringify({ parkSlug, tripSlug: trip.slug, expireImmediately }),
    });
    assert.equal(response.status, 200, "Authenticated same-origin invalidation");
  };
  // Start the cache assertions with explicitly expired public output.
  await invalidate();
  await invalidate(true, "recovering-park");
  failMap = true;
  const failedMap = await get("/paikat");
  assert.notEqual(failedMap.response.headers.get("x-nextjs-cache"), "HIT");
  failMap = false;
  await cached("/paikat", "Testipuisto 1");
  await cached("/");
  await cached("/retket", "Testiretki 1");
  await cached("/paikka/fixture-park", "Testipuisto 1");
  await cached("/retki/fixture-trip", "Testiretki 1");
  await cached("/sitemap.xml", "/retki/fixture-trip");
  assert(!(await get("/sitemap.xml")).body.includes("new-trip"));
  console.log("PASS public cache hits, no repeated API reads, and map failure recovery");

  const failedPark = await get("/paikka/recovering-park");
  assert.notEqual(failedPark.response.headers.get("x-nextjs-cache"), "HIT");
  recoveringPark = true;
  await cached("/paikka/recovering-park", "Testipuisto");
  const admin = await get("/paikka/hidden-park", { cookie: `__session=${token}` });
  assert(admin.body.includes("SALAINEN PUISTO"));
  assert.match(admin.response.headers.get("cache-control"), /private.*no-store/);
  const anonymous = await get("/paikka/hidden-park");
  assert(!anonymous.body.includes("SALAINEN PUISTO"));
  const adminAfterAnonymous = await get("/paikka/hidden-park", { cookie: `__session=${token}` });
  assert(adminAfterAnonymous.body.includes("SALAINEN PUISTO"));
  assert.match(adminAfterAnonymous.response.headers.get("cache-control"), /private.*no-store/);
  console.log("PASS hidden-park isolation in both request orders and park failure recovery");

  revision = 2;
  additionalTrip = true;
  await invalidate();
  await cached("/paikat", "Testipuisto 2");
  await cached("/paikka/fixture-park", "Testipuisto 2");
  await cached("/retket", "Testiretki 2");
  await cached("/retki/fixture-trip", "Testiretki 2");
  await cached("/sitemap.xml", "/retki/new-trip");
  console.log("PASS edit/publication invalidation for pages and sitemap");

  for (const path of ["/extra", "/paikat/extra", "/retket/extra", "/sitemap.xml/extra"]) {
    const missing = await get(path);
    if (path.startsWith("/sitemap.xml")) assert.equal(missing.response.status, 404, path);
    else
      assert(
        missing.response.status === 404 || missing.body.includes("noindex"),
        `${path}: Next.js not-found response (streamed responses may use HTTP 200)`,
      );
  }
  for (const [from, to] of [
    ["/parks", "/paikat"],
    ["/trips", "/retket"],
    ["/park/fixture-park", "/paikka/fixture-park"],
  ]) {
    const response = await fetch(`${origin}${from}`, { redirect: "manual" });
    assert.equal(response.status, 308);
    assert.equal(new URL(response.headers.get("location"), origin).pathname, to);
  }
  browser = await chromium.launch({ headless: true });
  const serverRendered = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 900 },
  });
  try {
    const page = await serverRendered.newPage();
    for (const path of ["/", "/retket", "/paikka/fixture-park", "/retki/fixture-trip"]) {
      await page.goto(`${origin}${path}`);
      // Next streams loading boundaries into hidden HTML containers and reveals
      // them with its inline script. Inspect actual server DOM before hydration.
      await expect(page.locator("h1")).toBeAttached();
    }
    await page.goto(`${origin}/paikat`);
    await expect(page.locator("#park-map-filters-mobile")).toBeAttached();
  } finally {
    await serverRendered.close();
  }
  console.log("PASS public content and map controls are present in server HTML before hydration");
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion,
      serviceWorkers: "allow",
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
      const sharedUrl = `${origin}/paikka/fixture-park?visit=10#visit-history`;
      await page.goto(sharedUrl);
      const selected = page.locator("#park-visit-10");
      await expect(selected).toHaveClass(/ring-primary/);
      await expect(selected.getByRole("button", { expanded: true })).toBeVisible();
      await expect
        .poll(() =>
          selected.evaluate((card) => {
            const navBottom =
              document.querySelector('nav:has(a[href="#visit-history"])')?.getBoundingClientRect()
                .bottom ?? 0;
            const top = card.getBoundingClientRect().top;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            return Math.abs(top - Math.max(navBottom, window.scrollY + top - maxScroll));
          }),
        )
        .toBeLessThanOrEqual(3);
      await page.reload();
      await expect(selected.getByRole("button", { expanded: true })).toBeVisible();
      await expect(page.locator('nav a[href="#visit-history"]')).toHaveAttribute(
        "aria-current",
        "location",
      );
      assert.equal(page.url(), sharedUrl);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      assert.equal(new URL(canonical).pathname, "/paikka/fixture-park");
      await page.goto(`${origin}/extra`);
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        /noindex/,
      );
      assert.deepEqual(errors, [], "No hydration or browser errors");
    } finally {
      await context.close();
    }
  }
  console.log(
    "PASS query-selected visit links, reload, section navigation and canonical metadata in headless Chromium",
  );

  withdrawn = true;
  await invalidate(false);
  const withdrawnPage = await get("/paikka/fixture-park");
  assert(
    !withdrawnPage.body.includes("Testipuisto 2"),
    "Withdrawal must remove cached park content on the next request",
  );
  console.log("PASS withdrawal with the normal mutation invalidation profile");
} catch (error) {
  process.stderr.write(logs.join("").split("\n").slice(-45).join("\n"));
  throw error;
} finally {
  await browser?.close();
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
    await exited;
    clearTimeout(timer);
  }
  fixture.closeAllConnections();
  await new Promise((resolve) => fixture.close(resolve));
}
