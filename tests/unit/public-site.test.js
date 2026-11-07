import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PublicSite from "@/features/website/components/PublicSite";
import { TEMPLATE_IDS, defaultHours } from "@/config/restaurant-templates";

const site = (over = {}, brandingOver = {}) => ({
  name: "Green Lagoon Hotel",
  branding: { template: "premium-restaurant", fontPairing: "editorial", primaryColor: "#1C2330", tagline: "Lakeside dining", ...brandingOver },
  website: {
    slug: "green-lagoon",
    hero: { headline: "Dine by the lake", subheadline: "Fresh and local", ctaLabel: "Reserve", ctaUrl: "https://example.com/reserve" },
    about: { title: "Our story", body: "Family run since 1998." },
    contact: { phone: "+92 300 1234567", email: "hello@example.com", address: "Chashma, Mianwali", mapUrl: "https://maps.example.com/x" },
    hours: defaultHours().map((h, i) => (i === 6 ? { ...h, closed: true } : h)),
    social: { instagram: "https://instagram.com/lagoon", facebook: "", tiktok: "", website: "", whatsapp: "+92 300 1234567" },
    seo: { title: "", description: "" },
    ...over,
  },
});
const render = (s, preview = false) => renderToStaticMarkup(createElement(PublicSite, { site: s, preview }));

describe("PublicSite", () => {
  it("renders every template with the restaurant's content", () => {
    for (const template of TEMPLATE_IDS) {
      const html = render(site({}, { template }));
      expect(html, template).toContain("Dine by the lake");
      expect(html, template).toContain("Opening hours");
      expect(html, template).toContain("Closed");
      expect(html, template).toContain("Green Lagoon Hotel");
    }
  });

  it("escapes HTML in every user-provided text field", () => {
    const evil = "<script>alert(1)</script><img src=x onerror=alert(1)>";
    const html = render({ ...site({ hero: { headline: evil, subheadline: evil, ctaLabel: "", ctaUrl: "" }, about: { title: evil, body: evil }, contact: { phone: "", email: "", address: evil, mapUrl: "" } }), name: evil });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("never links non-https URLs, even if bad data is stored", () => {
    const html = render(site({
      hero: { headline: "Hi", subheadline: "", ctaLabel: "Go", ctaUrl: "javascript:alert(1)" },
      contact: { phone: "", email: "", address: "x", mapUrl: "data:text/html,boom" },
      social: { instagram: "http://insecure.com", facebook: "javascript:alert(1)", tiktok: "", website: "ftp://x", whatsapp: "" },
    }));
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:text/html");
    expect(html).not.toContain("http://insecure.com");
    expect(html).not.toContain("ftp://");
  });

  it("external links are https and carry rel=noopener noreferrer", () => {
    const html = render(site());
    expect(html).toContain('href="https://example.com/reserve"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("https://wa.me/923001234567");
    expect(html).toContain('href="tel:+923001234567"');
  });

  it("falls back to the template colour when the brand colour is unreadable or invalid", () => {
    expect(render(site({}, { primaryColor: "#7A7A7A" }))).toContain("--primary:#1C2330");
    expect(render(site({}, { primaryColor: "nonsense" }))).toContain("--primary:#1C2330");
    expect(render(site({}, { primaryColor: "#8B0000" }))).toContain("--primary:#8B0000");
  });

  it("scopes template colours to the site wrapper and marks previews", () => {
    const html = render(site({}, { template: "fine-dining" }), true);
    expect(html).toContain("--background:#0E0E10");
    expect(html).toContain('data-preview="true"');
    expect(render(site())).not.toContain("data-preview");
  });

  it("falls back to the restaurant name when there is no headline, and handles sparse data", () => {
    const html = render(site({ hero: { headline: "", subheadline: "", ctaLabel: "", ctaUrl: "" }, about: { title: "", body: "" }, contact: { phone: "", email: "", address: "", mapUrl: "" }, social: {} }));
    expect(html).toContain("<h1");
    expect(html).toContain("Green Lagoon Hotel");
    expect(html).not.toContain('id="contact"');
    expect(html).not.toContain('id="about"');
  });
});
