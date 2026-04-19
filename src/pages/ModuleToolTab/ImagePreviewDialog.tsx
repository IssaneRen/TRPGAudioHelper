import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  nodeLabel: string;
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  nodeLabel,
}: ImagePreviewDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative max-w-4xl max-h-[90vh] pointer-events-auto">
              <div className="absolute -top-10 left-0 right-0 flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">{nodeLabel}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <img
                src={imageUrl}
                alt={nodeLabel}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
