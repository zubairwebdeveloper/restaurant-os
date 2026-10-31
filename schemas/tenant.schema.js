import { z } from "zod";
import { MEMBER_STATUSES, TENANT_ROLES, TENANT_STATUSES } from "@/config/permissions";

export const BUSINESS_TYPES = ["RESTAURANT", "HOTEL", "CAFE", "FAST_FOOD", "CLOUD_KITCHEN", "OTHER"];

export const tenantIdSchema = z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid restaurant id");

/** Validates what an owner submits when applying for a workspace. Status is set by the server. */
export const tenantApplicationInputSchema = z.object({
  restaurantName: z.string().trim().min(2, "Enter the restaurant name").max(80),
  businessType: z.enum(BUSINESS_TYPES),
  city: z.string().trim().min(2).max(60),
  country: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(6).max(24).regex(/^[0-9+()\-\s]+$/, "Use digits, spaces, + ( ) or -"),
});

export const tenantStatusSchema = z.enum(TENANT_STATUSES);
export const tenantRoleSchema = z.enum(TENANT_ROLES);
export const memberStatusSchema = z.enum(MEMBER_STATUSES);
