import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const palette = [
  { name: "Deep Forest", hex: "#151D18" },
  { name: "Warm Ivory", hex: "#F5F0E6" },
  { name: "Muted Gold", hex: "#B9975B" },
  { name: "Olive", hex: "#66745A" },
  { name: "Charcoal", hex: "#292D29" },
  { name: "Sand", hex: "#D8C8AC" },
];

// Phase 1 foundation preview. The full cinematic homepage is built in Phase 2.
export default function Home() {
  return (
    <main className="flex-1 py-20 sm:py-28">
      <Container>
        <Reveal>
          <Badge variant="olive">{siteConfig.location}</Badge>
          <h1 className="mt-6 max-w-4xl text-6xl sm:text-7xl lg:text-8xl">
            {siteConfig.name}
          </h1>
          <p className="mt-6 max-w-xl font-heading text-2xl italic text-sand sm:text-3xl">
            {siteConfig.tagline}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg">Reserve a table</Button>
            <Button size="lg" variant="outline">
              <Link href="/menu">View menu</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Foundation is ready</CardTitle>
              <CardDescription>
                Design tokens, fonts, UI kit and project structure are in place.
                The full public website arrives in Phase 2.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {palette.map((c) => (
                <div
                  key={c.hex}
                  className="overflow-hidden rounded-sm border border-ivory/10"
                >
                  <div className="h-16" style={{ background: c.hex }} />
                  <div className="p-3">
                    <p className="text-sm text-ivory">{c.name}</p>
                    <p className="text-xs text-ivory/50">{c.hex}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      </Container>
    </main>
  );
}
