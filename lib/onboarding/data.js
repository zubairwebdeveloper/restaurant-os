import "server-only";
import { requireSession } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { listOwnApplications } from "./applications";

export async function loadMyApplications() {
  const session = await requireSession();
  return listOwnApplications(getAdminDb(), session.user.uid);
}
