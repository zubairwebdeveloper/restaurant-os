import { cn } from "@/lib/utils/cn";

export function SectionHeading({ title, description, align = "left", className }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <h2 className="text-4xl sm:text-5xl lg:text-6xl text-ivory">{title}</h2>
      {description ? (
        <p className="mt-5 text-base leading-relaxed text-ivory/70 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
