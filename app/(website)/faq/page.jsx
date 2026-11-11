import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getFaqs } from "@/services/content";

export const metadata = { title: "FAQ", description: "Answers to common questions about dining and staying at Green Lagoon." };

export default async function FaqPage() {
  const faqs = await getFaqs();
  return (
    <>
      <PageHero title="Frequently asked questions" />
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </section>
    </>
  );
}
