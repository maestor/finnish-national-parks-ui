import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().url().optional(),
  AUTH_JWT_SECRET: z.string().min(1).optional(),
  AUTH_COOKIE_NAME: z.string().min(1).default("__session"),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

const validateEnv = (): Env => {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_KEY: process.env.API_KEY,
    NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
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
