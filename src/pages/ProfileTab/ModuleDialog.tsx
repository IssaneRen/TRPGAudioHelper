import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Module, ModuleStatus } from "@/types";

interface ModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: Module | null;
  onSave: (mod: Module) => void;
}

const statusOptions: { value: ModuleStatus; label: string }[] = [
  { value: "prepared", label: "已备" },
  { value: "pending", label: "待备" },
  { value: "completed", label: "已带" },
];

export function ModuleDialog({ open, onOpenChange, module, onSave }: ModuleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ModuleStatus>("pending");
  const [playerCount, setPlayerCount] = useState("");
  const [duration, setDuration] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (module) {
      setName(module.name);
      setDescription(module.description);
      setStatus(module.status);
      setPlayerCount(module.playerCount);
      setDuration(module.duration);
      setTagsInput(module.tags.join(", "));
    } else {
      setName("");
      setDescription("");
      setStatus("pending");
      setPlayerCount("");
      setDuration("");
      setTagsInput("");
    }
  }, [module, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: module?.id ?? "",
      name,
      description,
      status,
      playerCount,
      duration,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: module?.createdAt ?? "",
      updatedAt: "",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-lg border bg-background p-6 shadow-xl sm:inset-x-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {module ? "编辑模组" : "添加模组"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mod-name">模组名称 *</Label>
                <Input
                  id="mod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="例：迷雾之城"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mod-desc">描述</Label>
                <Textarea
                  id="mod-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="简要描述模组内容"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>状态</Label>
                  <div className="flex flex-col gap-1">
                    {statusOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={status === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatus(opt.value)}
                        className="justify-start"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mod-players">人数</Label>
                  <Input
                    id="mod-players"
                    value={playerCount}
                    onChange={(e) => setPlayerCount(e.target.value)}
                    placeholder="3-5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mod-duration">时长</Label>
                  <Input
                    id="mod-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="4-6h"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mod-tags">标签（逗号分隔）</Label>
                <Input
                  id="mod-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="恐怖, 推理, 日系"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={!name.trim()}>
                  {module ? "更新" : "添加"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
