import { Container } from "@/components/shared/container";

export function PageHero({ title, description, children }) {
  return (
    <section className="relative overflow-hidden border-b border-ivory/10 pb-16 pt-36 sm:pb-20 sm:pt-44">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full border border-gold/20" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-[20rem] rounded-full border border-gold/10" />
      <Container className="relative">
        <h1 className="max-w-3xl text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
        {description ? <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/70">{description}</p> : null}
        {children}
      </Container>
    </section>
  );
}
