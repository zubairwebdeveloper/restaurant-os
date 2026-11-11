import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";

export function LegalPage({ title, updated, sections }) {
  return (
    <>
      <PageHero title={title} description={`Last updated ${updated}`} />
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl space-y-10">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-3xl">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-ivory/70">{s.body}</p>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}
