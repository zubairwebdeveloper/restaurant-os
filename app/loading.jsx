import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex-1 py-24" aria-busy="true" aria-label="Loading">
      <Container className="space-y-6">
        <Skeleton className="h-14 w-2/3 max-w-xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-5 w-4/5 max-w-xl" />
        <Skeleton className="mt-10 h-72 w-full" />
      </Container>
    </main>
  );
}
