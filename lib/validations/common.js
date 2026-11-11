import { z } from "zod";

// Pakistani mobile numbers: 03XXXXXXXXX or +923XXXXXXXXX
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+92|0)?3\d{9}$/, "Enter a valid Pakistani mobile number");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long");
