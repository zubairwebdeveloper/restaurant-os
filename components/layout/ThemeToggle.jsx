"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectThemeHydrated, selectThemeMode, setThemeMode } from "@/store/slices/themeSlice";
import { cn } from "@/lib/utils/cn";

const OPTIONS = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "system", label: "System theme", icon: Monitor },
  { value: "dark", label: "Dark theme", icon: Moon },
];

export default function ThemeToggle() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);
  const hydrated = useAppSelector(selectThemeHydrated);

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = hydrated && mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => dispatch(setThemeMode(value))}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
