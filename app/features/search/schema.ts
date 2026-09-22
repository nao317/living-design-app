import { z } from "zod";

export const searchParamsSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  category: z.enum(["", "kitchen", "living", "bath"]).catch(""),
  priceMin: z.coerce.number().int().min(0).optional().catch(undefined),
  priceMax: z.coerce.number().int().min(0).optional().catch(undefined),
  period: z.enum(["", "1", "3"]).catch(""),
  style: z.enum(["", "storage", "insulation"]).catch(""),
  page: z.coerce.number().int().positive().catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
