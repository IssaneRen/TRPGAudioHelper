import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EdgeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAction?: string;
  onConfirm: (action: string) => void;
}

export function EdgeEditDialog({
  open,
  onOpenChange,
  initialAction,
  onConfirm,
}: EdgeEditDialogProps) {
  const [action, setAction] = useState("");

  useEffect(() => {
    if (open) {
      setAction(initialAction || "");
    }
  }, [open, initialAction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(action.trim() || "关联");
    setAction("");
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
            className="fixed inset-x-4 top-[30%] z-50 mx-auto max-w-sm rounded-lg border bg-background p-6 shadow-xl sm:inset-x-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">编辑关系</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edge-action">关系描述</Label>
                <Input
                  id="edge-action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="例：阅读、调查、询问"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
