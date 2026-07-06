import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config", () => {
  it("traces the Next config runtime files for the serwist route", () => {
    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
    });
  });
});
