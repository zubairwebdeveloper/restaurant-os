import { MapPin, Clock } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";

export function Location() {
  const { contact, hours } = siteConfig;
  return (
    <section className="bg-[#101712] py-24 sm:py-32">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <Reveal>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl">
            On the edge of Chashma Lake
          </h2>
          <ul className="mt-9 space-y-6 text-ivory/75">
            <li className="flex gap-4">
              <MapPin className="mt-1 size-5 shrink-0 text-gold" />
              <span>{contact.address}</span>
            </li>
            <li className="flex gap-4">
              <Clock className="mt-1 size-5 shrink-0 text-gold" />
              <span className="space-y-1">
                {hours.map((h) => (
                  <span key={h.days} className="block">
                    <span className="text-ivory">{h.days}:</span> {h.time}
                  </span>
                ))}
              </span>
            </li>
          </ul>
          <Button size="lg" className="mt-9">
            <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer">
              Open in Google Maps
            </a>
          </Button>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-md border border-gold/25 bg-charcoal"
            role="img"
            aria-label="Stylised map showing Green Lagoon beside the lake"
          >
            <svg
              viewBox="0 0 400 300"
              className="absolute inset-0 size-full"
              aria-hidden="true"
            >
              <rect width="400" height="300" fill="#1b251f" />
              <path
                d="M0 190 C70 150 120 215 190 185 C260 155 300 100 400 120 L400 300 L0 300Z"
                fill="#66745A"
                opacity="0.55"
              />
              <path
                d="M0 220 C80 190 140 245 210 218 C280 190 330 145 400 160 L400 300 L0 300Z"
                fill="#151D18"
                opacity="0.7"
              />
              {[60, 100, 140, 180, 220, 260, 300, 340].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="300"
                  stroke="#F5F0E6"
                  strokeOpacity="0.04"
                />
              ))}
              {[50, 100, 150, 200, 250].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="400"
                  y2={y}
                  stroke="#F5F0E6"
                  strokeOpacity="0.04"
                />
              ))}
              <circle cx="205" cy="120" r="26" fill="#B9975B" opacity="0.2" />
              <circle cx="205" cy="120" r="9" fill="#B9975B" />
            </svg>
            <span className="absolute bottom-4 left-4 rounded-sm bg-forest/80 px-3 py-1.5 font-heading text-lg text-ivory">
              Green Lagoon Hotel
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
