import { Suspense } from "react";
import { Hero } from "@/features/home/hero";
import { Intro } from "@/features/home/intro";
import { SignatureDishes } from "@/features/home/signature-dishes";
import { MenuPreview } from "@/features/home/menu-preview";
import { Experience } from "@/features/home/experience";
import { RoomsPreview } from "@/features/home/rooms-preview";
import { ChefIntro } from "@/features/home/chef-intro";
import { GalleryStrip } from "@/features/home/gallery-strip";
import { TestimonialsSection } from "@/features/home/testimonials-section";
import { ReservationCta } from "@/features/home/reservation-cta";
import { Location } from "@/features/home/location";
import { Newsletter } from "@/features/home/newsletter";
import { Skeleton } from "@/components/ui/skeleton";

const SectionFallback = () => (
  <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-12">
    <Skeleton className="h-12 w-1/2" />
    <Skeleton className="mt-8 h-64 w-full" />
  </div>
);

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <Suspense fallback={<SectionFallback />}><SignatureDishes /></Suspense>
      <Suspense fallback={<SectionFallback />}><MenuPreview /></Suspense>
      <Suspense fallback={<SectionFallback />}><Experience /></Suspense>
      <Suspense fallback={<SectionFallback />}><RoomsPreview /></Suspense>
      <Suspense fallback={<SectionFallback />}><ChefIntro /></Suspense>
      <Suspense fallback={<SectionFallback />}><GalleryStrip /></Suspense>
      <Suspense fallback={<SectionFallback />}><TestimonialsSection /></Suspense>
      <ReservationCta />
      <Location />
      <Newsletter />
    </>
  );
}
