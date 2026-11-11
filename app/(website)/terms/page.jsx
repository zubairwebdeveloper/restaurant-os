import { LegalPage } from "@/components/shared/legal-page";

export const metadata = { title: "Terms of Service" };

// Template text. Have it reviewed by a legal professional before launch.
const sections = [
  { title: "Reservations", body: "Tables are held for 20 minutes after the booked time. Please tell us if your plans change so we can offer the table to other guests." },
  { title: "Orders and prices", body: "Prices are in Pakistani rupees and may change. The final price is confirmed by the restaurant when your order is accepted." },
  { title: "Room stays", body: "Check-in is from 2:00 pm and check-out is by 12:00 pm. Cancellation and deposit terms are confirmed when your room booking is accepted." },
  { title: "Use of this website", body: "The content on this website belongs to Green Lagoon Hotel. Please do not copy or reuse it without permission." },
];

export default function TermsPage() {
  return <LegalPage title="Terms of service" updated="November 2026" sections={sections} />;
}
