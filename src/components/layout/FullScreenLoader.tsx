import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.4 }}>
        <Logo className="size-10" />
      </motion.div>
    </div>
  );
}
