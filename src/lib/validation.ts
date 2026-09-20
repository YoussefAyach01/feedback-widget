import { z } from "zod";

export const KINDS = ["idea", "bug", "other"] as const;
export const ROADMAP_STATUSES = ["planned", "in_progress", "done"] as const;
export const FEEDBACK_STATUSES = ["new", "read", "archived"] as const;

/** Strips control characters (except newline/tab) and trims. Rendering is escaped separately. */
export function cleanText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

const text = (max: number, min = 0) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(min).max(max));

export const feedbackSchema = z.object({
  kind: z.enum(KINDS),
  message: text(2000, 3),
  email: z
    .string()
    .transform(cleanText)
    .pipe(z.union([z.literal(""), z.email().max(200)]))
    .default(""),
  pageUrl: text(500).default(""),
});

export const voteSchema = z.object({
  itemId: z.number().int().positive(),
  voter: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
});

export const projectSchema = z.object({
  name: text(60, 1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide (ex. #5b3df5)").transform((c) => c.toLowerCase()),
  origins: z.string().max(2000).default(""),
});

export const roadmapSchema = z.object({
  title: text(120, 1),
  description: text(500),
  status: z.enum(ROADMAP_STATUSES),
  visible: z.boolean(),
});

export const signupSchema = z.object({
  email: z
    .email()
    .max(200)
    .transform((e) => e.toLowerCase()),
  password: z.string().min(8, "8 caractères minimum").max(200),
});

export const FREE_PROJECT_LIMIT = 1;
