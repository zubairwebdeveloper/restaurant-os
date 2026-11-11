import { cn } from "@/lib/utils/cn";

export function Container({ as: Tag = "div", className, ...props }) {
  return <Tag className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12", className)} {...props} />;
}
