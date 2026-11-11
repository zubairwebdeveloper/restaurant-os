import { testimonials, experiences } from "@/features/home/data";
import { faqs } from "@/features/faq/data";
export async function getTestimonials() { return testimonials; }
export async function getExperiences() { return experiences; }
export async function getFaqs() { return faqs; }
