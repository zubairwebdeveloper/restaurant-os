import { isFirebaseConfigured } from "@/lib/firebase/client";

export function GET() {
  return Response.json({
    status: "ok",
    app: "green-lagoon",
    firebaseConfigured: isFirebaseConfigured,
  });
}
