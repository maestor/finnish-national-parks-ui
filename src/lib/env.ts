import { z } from "zod";

const toAbsoluteUrl = (value: string): URL => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value);
  }

  return new URL(`https://${value}`);
};

const urlOrHostSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      toAbsoluteUrl(value);
      return true;
    } catch {
      return false;
    }
  }, "Must be a valid absolute URL or host");

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: urlOrHostSchema.optional(),
  API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().url().optional(),
  AUTH_JWT_SECRET: z.string().min(32).optional(),
  AUTH_COOKIE_NAME: z.string().min(1).default("__session"),
  VERCEL_PROJECT_PRODUCTION_URL: urlOrHostSchema.optional(),
  VERCEL_URL: urlOrHostSchema.optional(),
});

type Env = z.infer<typeof envSchema>;
const siteEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: urlOrHostSchema.optional(),
  VERCEL_PROJECT_PRODUCTION_URL: urlOrHostSchema.optional(),
  VERCEL_URL: urlOrHostSchema.optional(),
});

type SiteEnv = z.infer<typeof siteEnvSchema>;

let cachedEnv: Env | null = null;
let cachedSiteEnv: SiteEnv | null = null;

const formatEnvError = (message: string, fieldErrors: Record<string, string[] | undefined>) =>
  `${message}: ${JSON.stringify(fieldErrors)}`;

const validateEnv = (): Env => {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    API_KEY: process.env.API_KEY,
    NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });

  if (!parsed.success) {
    throw new Error(
      formatEnvError("Invalid environment variables", parsed.error.flatten().fieldErrors),
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

const validateSiteEnv = (): SiteEnv => {
  if (cachedSiteEnv) return cachedSiteEnv;

  const parsed = siteEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });

  if (!parsed.success) {
    throw new Error(
      formatEnvError("Invalid site environment variables", parsed.error.flatten().fieldErrors),
    );
  }

  cachedSiteEnv = parsed.data;
  return cachedSiteEnv;
};

const createEnvProxy = <T extends object>(validate: () => T): T =>
  new Proxy({} as T, {
    get(_, prop: string | symbol) {
      return validate()[prop as keyof T];
    },
  });

export const env = createEnvProxy(validateEnv);

export const siteEnv = createEnvProxy(validateSiteEnv);
