import Link from "next/link";
import { FaInstagram, FaFacebookF, FaWhatsapp } from "react-icons/fa6";
import { MapPin, Phone, Mail } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/shared/container";

export function Footer() {
  const { contact, hours } = siteConfig;
  return (
    <footer className="border-t border-gold/20 bg-[#0f1511] pt-20 pb-10">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <p className="font-heading text-4xl text-ivory">Green Lagoon</p>
            <p className="mt-4 max-w-xs font-heading text-xl italic text-sand">{siteConfig.tagline}</p>
            <div className="mt-6 flex gap-3">
              {[
                { Icon: FaInstagram, label: "Instagram" },
                { Icon: FaFacebookF, label: "Facebook" },
                { Icon: FaWhatsapp, label: "WhatsApp" },
              ].map(({ Icon, label }) => (
                <a key={label} href="#" aria-label={label} className="grid size-10 place-items-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-gold hover:text-gold">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-heading text-2xl text-ivory">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/70">
              {[...siteConfig.nav, { label: "Reservation", href: "/reservation" }, { label: "Order online", href: "/order" }].map((l) => (
                <li key={l.href}><Link href={l.href} className="transition-colors hover:text-gold">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-2xl text-ivory">Hours</h3>
            <ul className="mt-4 space-y-3 text-sm text-ivory/70">
              {hours.map((h) => (
                <li key={h.days}><span className="block text-ivory">{h.days}</span>{h.time}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-2xl text-ivory">Find us</h3>
            <ul className="mt-4 space-y-3 text-sm text-ivory/70">
              <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" />{contact.address}</li>
              <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-gold" />{contact.phone}</li>
              <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-gold" />{contact.email}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-ivory/10 pt-6 text-xs text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {siteConfig.year} {siteConfig.name}. All rights reserved.</p>
          <ul className="flex gap-6">
            {siteConfig.footerLinks.map((l) => (
              <li key={l.href}><Link href={l.href} className="transition-colors hover:text-gold">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
