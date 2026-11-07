import { FONT_PAIRINGS, getTemplate } from "@/config/restaurant-templates";
import { DIETARY_LABELS } from "@/config/menu";
import { buildBrandStyle, readableForeground } from "@/lib/utils/color";
import { formatMoney } from "@/lib/utils/money";

/** Defence in depth: even stored data is only ever linked if it is a real https URL. */
function httpsOnly(value) {
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

const whatsappLink = (number) => `https://wa.me/${String(number).replace(/\D/g, "")}`;

function Link({ href, children, className }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/**
 * Renders any restaurant site from data + a template. Used for the live site and the editor preview.
 * All text is rendered as React text (escaped); links are https-validated before they are stored.
 * Template colours are scoped CSS variables, so the dashboard theme never leaks into a public site.
 */
export default function PublicSite({ site, preview = false }) {
  const { name, branding, website, menu } = site;
  const menuCategories = menu?.categories ?? [];
  const template = getTemplate(branding.template);
  const brand = buildBrandStyle(branding.primaryColor);
  const primary = brand.ok
    ? brand.style
    : { "--primary": template.defaultPrimary, "--primary-foreground": readableForeground(template.defaultPrimary), "--ring": template.defaultPrimary };
  const fonts = FONT_PAIRINGS[branding.fontPairing] ?? FONT_PAIRINGS[template.fontPairing];
  const style = {
    ...template.vars, ...primary,
    "--font-display": fonts.display, "--font-sans": fonts.body,
    fontFamily: fonts.body, background: template.vars["--background"], color: template.vars["--foreground"],
  };

  const { hero, about, contact, hours, social } = website;
  const headline = hero?.headline || name;
  const headingCase = template.uppercaseHeadings ? "uppercase tracking-tight" : "";
  const hasContact = contact && (contact.phone || contact.email || contact.address || httpsOnly(contact.mapUrl));
  const ctaUrl = httpsOnly(hero?.ctaUrl);
  const mapUrl = httpsOnly(contact?.mapUrl);
  const socials = [
    httpsOnly(social?.instagram) && ["Instagram", social.instagram],
    httpsOnly(social?.facebook) && ["Facebook", social.facebook],
    httpsOnly(social?.tiktok) && ["TikTok", social.tiktok],
    httpsOnly(social?.website) && ["Website", social.website],
    social?.whatsapp && whatsappLink(social.whatsapp).length > 14 && ["WhatsApp", whatsappLink(social.whatsapp)],
  ].filter(Boolean);

  const cta =
    hero?.ctaLabel && ctaUrl ? (
      <Link href={ctaUrl} className="mt-8 inline-flex h-12 items-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground">
        {hero.ctaLabel}
      </Link>
    ) : null;

  const heading = (
    <>
      <h1 className={`text-4xl font-semibold leading-tight sm:text-5xl ${headingCase}`}>{headline}</h1>
      {hero?.subheadline ? <p className="mt-4 max-w-xl text-lg text-muted-foreground">{hero.subheadline}</p> : null}
      {cta}
    </>
  );

  return (
    <div style={style} className="min-h-full" data-preview={preview ? "true" : undefined}>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <p className={`font-display text-lg font-semibold ${headingCase}`} style={{ fontFamily: "var(--font-display)" }}>{name}</p>
          <nav aria-label="Site sections" className="flex gap-5 text-sm">
            {menuCategories.length > 0 ? <a href="#menu" className="hover:underline">Menu</a> : null}
            {about?.body ? <a href="#about" className="hover:underline">About</a> : null}
            <a href="#hours" className="hover:underline">Hours</a>
            {hasContact ? <a href="#contact" className="hover:underline">Contact</a> : null}
          </nav>
        </div>
      </header>

      <main>
        {template.hero === "bold" ? (
          <section className="bg-primary text-primary-foreground">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <h1 className={`text-5xl font-black leading-none sm:text-7xl ${headingCase}`}>{headline}</h1>
              {hero?.subheadline ? <p className="mt-4 max-w-xl text-lg opacity-95">{hero.subheadline}</p> : null}
              {hero?.ctaLabel && ctaUrl ? (
                <Link href={ctaUrl} className="mt-8 inline-flex h-12 items-center rounded-md bg-background px-6 text-base font-bold text-foreground">{hero.ctaLabel}</Link>
              ) : null}
            </div>
          </section>
        ) : template.hero === "centered" ? (
          <section className="mx-auto max-w-3xl px-6 py-20 text-center">
            <span aria-hidden="true" className="mx-auto mb-6 block h-0.5 w-16 bg-primary" />
            {heading}
            {branding.tagline ? <p className="mt-6 text-sm text-muted-foreground">{branding.tagline}</p> : null}
          </section>
        ) : (
          <section className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-2">
            <div>
              {heading}
              {branding.tagline ? <p className="mt-6 text-sm text-muted-foreground">{branding.tagline}</p> : null}
            </div>
            <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-display text-8xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>{String(name).charAt(0)}</span>
            </div>
          </section>
        )}

        {menuCategories.length > 0 ? (
          <section id="menu" className="border-t border-border">
            <div className="mx-auto max-w-5xl px-6 py-14">
              <h2 className={`text-2xl font-semibold ${headingCase}`}>Menu</h2>
              {menuCategories.map((category) => (
                <div key={category.id} className="mt-8">
                  <h3 className={`text-xl font-semibold ${headingCase}`}>{category.name}</h3>
                  {category.description ? <p className="mt-1 text-sm text-muted-foreground">{category.description}</p> : null}
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                    {category.items.map((item) => {
                      const prices = item.variants.length > 0 ? item.variants.map((v) => v.priceMinor) : [item.priceMinor];
                      return (
                        <li key={item.id} className="rounded-lg border border-border bg-surface p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium">{item.name}</p>
                            <p className="tabular shrink-0 text-sm font-medium">
                              {item.variants.length > 0 ? "from " : ""}{formatMoney(Math.min(...prices), menu.currency)}
                            </p>
                          </div>
                          {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                          {item.variants.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.variants.map((v) => `${v.name} ${formatMoney(v.priceMinor, menu.currency)}`).join(" · ")}
                            </p>
                          ) : null}
                          {item.dietary.length > 0 || item.featured || !item.available ? (
                            <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Item details">
                              {item.featured ? <li className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">Featured</li> : null}
                              {item.dietary.map((d) => <li key={d} className="rounded-full border border-border px-2 py-0.5">{DIETARY_LABELS[d] ?? d}</li>)}
                              {!item.available ? <li className="rounded-full border border-border px-2 py-0.5 font-medium">Sold out</li> : null}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {about?.body ? (
          <section id="about" className="border-t border-border bg-surface">
            <div className="mx-auto max-w-3xl px-6 py-14">
              <h2 className={`text-2xl font-semibold ${headingCase}`}>{about.title || "About us"}</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed">{about.body}</p>
            </div>
          </section>
        ) : null}

        <section id="hours" className="border-t border-border">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 md:grid-cols-2">
            <div>
              <h2 className={`text-2xl font-semibold ${headingCase}`}>Opening hours</h2>
              <table className="mt-4 w-full max-w-sm text-sm">
                <caption className="sr-only">Opening hours</caption>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.day} className="border-b border-border">
                      <th scope="row" className="py-2 pr-4 text-left font-medium">{h.day}</th>
                      <td className="tabular py-2 text-right text-muted-foreground">{h.closed ? "Closed" : `${h.open} - ${h.close}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasContact ? (
              <div id="contact">
                <h2 className={`text-2xl font-semibold ${headingCase}`}>Find us</h2>
                <ul className="mt-4 space-y-2 text-sm">
                  {contact.address ? <li>{contact.address}</li> : null}
                  {contact.phone ? <li><a href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`} className="underline underline-offset-4">{contact.phone}</a></li> : null}
                  {contact.email ? <li><a href={`mailto:${encodeURI(contact.email)}`} className="underline underline-offset-4">{contact.email}</a></li> : null}
                  {mapUrl ? <li><Link href={mapUrl} className="underline underline-offset-4">View on map</Link></li> : null}
                </ul>
                {socials.length > 0 ? (
                  <ul className="mt-6 flex flex-wrap gap-3" aria-label="Social links">
                    {socials.map(([label, href]) => (
                      <li key={label}><Link href={href} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted">{label}</Link></li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-6 py-6 text-xs text-muted-foreground">{name}</p>
      </footer>
    </div>
  );
}
