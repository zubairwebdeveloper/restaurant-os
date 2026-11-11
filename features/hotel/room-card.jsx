import Link from "next/link";
import { BedDouble, Users, Maximize2 } from "lucide-react";
import { ImageSlot } from "@/components/shared/image-slot";
import { formatPrice } from "@/lib/utils/format";

export function RoomCard({ room, tone = 0 }) {
  return (
    <article className="group overflow-hidden rounded-md border border-ivory/10 bg-charcoal/40 transition-all duration-300 hover:border-gold/40 hover:shadow-lift">
      <div className="overflow-hidden">
        <ImageSlot src={room.image} alt={room.name} caption={room.name} tone={tone} sizes="(min-width:1024px) 30vw, 100vw" className="aspect-[4/3] transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-3xl">{room.name}</h3>
          <p className="shrink-0 text-right text-sm text-ivory/60"><span className="font-heading text-2xl text-gold">{formatPrice(room.price)}</span> / night</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ivory/65">{room.description}</p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ivory/75">
          <li className="flex items-center gap-2"><Maximize2 className="size-4 text-gold" />{room.size}</li>
          <li className="flex items-center gap-2"><Users className="size-4 text-gold" />{room.guests} guests</li>
          <li className="flex items-center gap-2"><BedDouble className="size-4 text-gold" />{room.bed}</li>
        </ul>
        <Link href="/contact" className="mt-6 inline-block text-sm text-gold underline-offset-4 hover:underline">Ask about this room</Link>
      </div>
    </article>
  );
}
