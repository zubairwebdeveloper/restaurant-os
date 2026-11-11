import { z } from "zod";
import { emailSchema, nameSchema, phoneSchema } from "@/lib/validations/common";

export const newsletterSchema = z.object({ email: emailSchema });

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string().trim().min(3, "Add a short subject").max(120),
  message: z.string().trim().min(10, "Write at least 10 characters").max(1500),
});

export const reservationSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  date: z.string().min(1, "Choose a date").refine((v) => {
    const d = new Date(`${v}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d >= today;
  }, "Choose today or a future date"),
  time: z.string().min(1, "Choose a time"),
  guests: z.coerce.number().int().min(1, "At least 1 guest").max(40, "For more than 40 guests, please contact us"),
  occasion: z.string().optional(),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
});
