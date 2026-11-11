"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSlot } from "@/components/shared/image-slot";
import { cn } from "@/lib/utils/cn";

const ratioClass = { tall: "aspect-[3/4]", wide: "aspect-[4/3]", square: "aspect-square" };

export function GalleryGrid({ images }) {
  const [index, setIndex] = useState(null);
  const open = index !== null;
  const go = (d) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {images.map((img, i) => (
          <li key={img.id} className="break-inside-avoid">
            <button onClick={() => setIndex(i)} className="group block w-full overflow-hidden rounded-md text-left" aria-label={`Open photo: ${img.alt}`}>
              <ImageSlot src={img.src} alt={img.alt} caption={img.alt} tone={i} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className={cn("transition-transform duration-700 group-hover:scale-105", ratioClass[img.ratio])} />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
          >
            <Dialog.Title className="sr-only">Photo viewer</Dialog.Title>
            <Dialog.Description className="sr-only">Use the arrow keys to move between photos.</Dialog.Description>
            {open ? (
              <figure className="w-full max-w-3xl">
                <ImageSlot src={images[index].src} alt={images[index].alt} caption={images[index].alt} tone={index} sizes="90vw" className="aspect-[4/3] max-h-[78vh] w-full rounded-md" />
                <figcaption className="mt-3 text-center text-sm text-ivory/75">{images[index].alt}</figcaption>
              </figure>
            ) : null}
            <Dialog.Close className="absolute right-5 top-5 grid size-11 place-items-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20" aria-label="Close photo"><X className="size-5" /></Dialog.Close>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20"><ChevronLeft /></button>
            <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20"><ChevronRight /></button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
