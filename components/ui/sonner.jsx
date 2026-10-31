"use client";

import { Toaster as Sonner } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { selectResolvedTheme } from "@/store/slices/themeSlice";

export function Toaster(props) {
  const theme = useAppSelector(selectResolvedTheme);
  return <Sonner theme={theme} position="bottom-right" closeButton {...props} />;
}
