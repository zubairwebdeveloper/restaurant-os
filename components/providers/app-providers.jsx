"use client";

import { Toaster } from "sonner";

export function AppProviders({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#292D29",
            color: "#F5F0E6",
            border: "1px solid rgb(185 151 91 / 0.35)",
          },
        }}
      />
    </>
  );
}
