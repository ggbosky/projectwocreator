import { Toaster } from "sonner";
import { useUi } from "@/store/ui";

export function ThemedToaster() {
  const theme = useUi((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ className: "!rounded-xl !border-border !font-sans", duration: 3200 }}
    />
  );
}
