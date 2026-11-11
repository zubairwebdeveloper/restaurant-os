export const siteConfig = {
  name: "Green Lagoon Hotel",
  shortName: "Green Lagoon",
  year: 2026,
  tagline: "Where Nature Meets Exceptional Dining.",
  description:
    "Green Lagoon Hotel in Chashma, Mianwali: lakeside dining, handcrafted menus and refined stays.",
  location: "Chashma, Mianwali, Pakistan",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  // TODO(client): replace the placeholder contact details below.
  contact: {
    phone: "+92 000 0000000",
    email: "hello@greenlagoon.example",
    address: "Lakeside Road, Chashma, District Mianwali, Pakistan",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Chashma+Barrage+Mianwali",
  },
  hours: [
    { days: "Monday to Friday", time: "12:00 pm to 11:00 pm" },
    { days: "Saturday and Sunday", time: "11:00 am to 12:00 am" },
  ],
  nav: [
    { label: "Menu", href: "/menu" },
    { label: "Rooms", href: "/rooms" },
    { label: "Gallery", href: "/gallery" },
    { label: "Chefs", href: "/chefs" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  footerLinks: [
    { label: "FAQ", href: "/faq" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};
