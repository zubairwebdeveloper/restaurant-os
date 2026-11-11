import Link from "next/link";
import { ImageSlot } from "@/components/shared/image-slot";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format";
import { AddToOrderButton } from "@/features/menu/add-to-order-button";
import { cn } from "@/lib/utils/cn";

export function MenuCard({ item, tone = 0, className, imageClass = "aspect-[4/3]" }) {
  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-md border border-ivory/10 bg-charcoal/40 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lift", className)}>
      <Link href={`/menu/${item.slug}`} className="block overflow-hidden" aria-label={`View ${item.name}`}>
        <ImageSlot
          src={item.image}
          alt={item.name}
          tone={tone}
          caption={item.name}
          sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw"
          className={cn("transition-transform duration-700 group-hover:scale-105", imageClass)}
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-heading text-2xl leading-tight text-ivory">
            <Link href={`/menu/${item.slug}`} className="hover:text-gold">{item.name}</Link>
          </h3>
          <p className="shrink-0 font-heading text-xl text-gold">{formatPrice(item.price)}</p>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ivory/65">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-5">
          <Badge variant="outline">{item.time}</Badge>
          <AddToOrderButton item={item} />
        </div>
      </div>
    </article>
  );
}
