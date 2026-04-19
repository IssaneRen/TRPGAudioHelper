import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/utils/image-compress";
import { toast } from "sonner";

interface NodeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: {
    label: string;
    description: string;
    category: string;
    imageData?: string;
  };
  onConfirm: (data: {
    label: string;
    description: string;
    category: string;
    imageData?: string;
  }) => void;
}

const categories = [
  { value: "core", label: "核心线索", color: "bg-emerald-500" },
  { value: "important", label: "重要线索", color: "bg-purple-500" },
  { value: "optional", label: "可选线索", color: "bg-amber-500" },
  { value: "default", label: "普通", color: "bg-gray-400" },
];

export function NodeEditDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onConfirm,
}: NodeEditDialogProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("default");
  const [imageData, setImageData] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setLabel(initialData?.label || "");
      setDescription(initialData?.description || "");
      setCategory(initialData?.category || "default");
      setImageData(initialData?.imageData);
    }
  }, [open, initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      toast.success("图片已上传");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "图片处理失败");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onConfirm({
      label: label.trim(),
      description: description.trim(),
      category,
      imageData,
    });
    setLabel("");
    setDescription("");
    setCategory("default");
    setImageData(undefined);
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
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-lg border bg-background p-6 shadow-xl sm:inset-x-auto max-h-[80vh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {mode === "create" ? "添加新线索" : "编辑线索"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node-label">线索名称 *</Label>
                <Input
                  id="node-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="例：神秘信件"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-desc">描述</Label>
                <Textarea
                  id="node-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="线索的详细描述..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>分类</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                        category === cat.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>图片（可选）</Label>
                {imageData ? (
                  <div className="relative">
                    <img
                      src={imageData}
                      alt="预览"
                      className="w-full h-32 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setImageData(undefined)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                    <Upload className="h-4 w-4" />
                    点击上传图片
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={!label.trim()}>
                  {mode === "create" ? "确认添加" : "保存修改"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
