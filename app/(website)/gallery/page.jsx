import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { GalleryGrid } from "@/features/gallery/gallery-grid";
import { getGalleryImages } from "@/services/gallery";

export const metadata = { title: "Gallery", description: "Photos of the food, rooms and lakeside setting at Green Lagoon." };

export default async function GalleryPage() {
  const images = await getGalleryImages();
  return (
    <>
      <PageHero title="Gallery" description="The terrace, the grill, the rooms and the lake, as our guests see them." />
      <section className="py-16 sm:py-20"><Container><GalleryGrid images={images} /></Container></section>
    </>
  );
}
