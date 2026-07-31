"use client";

import { Toaster } from "sonner";

/** Global toast alanı — layout'tan bir kez yüklenir. */
export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm",
        },
      }}
    />
  );
}
