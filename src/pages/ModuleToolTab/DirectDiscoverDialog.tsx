import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DirectDiscoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeLabel: string;
  onConfirm: (note: string) => void;
}

export function DirectDiscoverDialog({
  open,
  onOpenChange,
  nodeLabel,
  onConfirm,
}: DirectDiscoverDialogProps) {
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim()) {
      onConfirm(note.trim());
      setNote("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-md rounded-lg border bg-background p-6 shadow-xl sm:inset-x-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">直接发现线索</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mb-3 text-sm text-muted-foreground">
              你要直接标记「<strong>{nodeLabel}</strong>」为已发现。这是特殊情况，请说明发现原因：
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discover-note">发现说明 *</Label>
                <Textarea
                  id="discover-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例：玩家直觉搜索了书桌抽屉"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={!note.trim()}>
                  确认发现
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
