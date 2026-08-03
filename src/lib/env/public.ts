import { z } from "zod";

export const publicEnvironment = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
}).parse({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
