import { Testimonials } from "@/features/home/testimonials";
import { getTestimonials } from "@/services/content";

export async function TestimonialsSection() {
  const items = await getTestimonials();
  return <Testimonials items={items} />;
}
