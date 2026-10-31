import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-semibold sm:text-5xl">Run every restaurant from one platform.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Orders, kitchens, teams, inventory and finances in a single workspace per restaurant.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Foundation build. The marketing site arrives in a later phase.
      </p>
      <div className="mt-8">
        <Button  size="lg">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
