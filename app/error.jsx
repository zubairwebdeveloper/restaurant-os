"use client";

import { useEffect } from "react";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center py-24">
      <Container className="max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl">Something went wrong</h1>
        <p className="mt-5 text-ivory/70">
          We could not load this page. Try again, and if it keeps happening, contact us.
        </p>
        <Button className="mt-8" onClick={() => reset()}>
          Try again
        </Button>
      </Container>
    </main>
  );
}
