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
  AUTH_JWT_SECRET: z.string().min(1).optional(),
  AUTH_COOKIE_NAME: z.string().min(1).default("__session"),
  VERCEL_PROJECT_PRODUCTION_URL: urlOrHostSchema.optional(),
  VERCEL_URL: urlOrHostSchema.optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

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
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const env = new Proxy({} as Env, {
  get(_, prop: string | symbol) {
    return validateEnv()[prop as keyof Env];
  },
});
