import { LegalPage } from "@/components/shared/legal-page";

export const metadata = { title: "Privacy Policy" };

// Template text. Have it reviewed by a legal professional before launch.
const sections = [
  { title: "What we collect", body: "When you reserve a table, place an order or contact us, we collect the details you provide, such as your name, phone number, email address and notes." },
  { title: "How we use it", body: "We use your details to confirm bookings, prepare orders, answer questions and, if you opt in, send occasional updates. We do not sell your personal information." },
  { title: "Storage and security", body: "We keep your information only as long as needed for these purposes and protect it with reasonable technical and organisational measures." },
  { title: "Your choices", body: "You can ask us to correct or delete your information, or to stop sending you emails, by contacting us using the details on our contact page." },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" updated="November 2026" sections={sections} />;
}
