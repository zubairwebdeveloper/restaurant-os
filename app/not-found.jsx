import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center py-24">
      <Container className="max-w-2xl text-center">
        <p className="font-heading text-8xl text-gold">404</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">
          This page is not on our menu
        </h1>
        <p className="mt-5 text-ivory/70">
          The link may be old or mistyped. Head back home or browse what we
          serve.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button>
            <Link href="/">Back to home</Link>
          </Button>
          <Button variant="outline">
            <Link href="/menu">View menu</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
