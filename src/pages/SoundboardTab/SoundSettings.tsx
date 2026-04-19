import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Download, Trash2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ALL_KEYS, KEY_LABELS, type KeyCode } from "./keyboard-layout";

interface SoundSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boundKeys: Set<KeyCode>;
  onUploadSound: (key: KeyCode, file: File) => Promise<void>;
  onRemoveSound: (key: KeyCode) => void;
  onExport: () => void;
  onImport: () => void;
}

export function SoundSettings({
  open,
  onOpenChange,
  boundKeys,
  onUploadSound,
  onRemoveSound,
  onExport,
  onImport,
}: SoundSettingsProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileUpload = async (key: KeyCode, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("请选择音频文件");
      return;
    }

    if (file.size > 500 * 1024) {
      toast.error("音频文件不能超过 500KB");
      return;
    }

    setUploading(key);
    try {
      await onUploadSound(key, file);
      toast.success(`已绑定「${KEY_LABELS[key] || key.toUpperCase()}」的音效`);
    } catch {
      toast.error("音效上传失败");
    } finally {
      setUploading(null);
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
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 sm:w-96 border-l bg-background shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Music className="h-5 w-5" /> 音效设置
              </h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 导入导出 */}
            <div className="flex gap-2 p-4 border-b">
              <Button variant="outline" size="sm" className="flex-1" onClick={onExport}>
                <Download className="mr-1 h-4 w-4" /> 导出配置
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onImport}>
                <Upload className="mr-1 h-4 w-4" /> 导入配置
              </Button>
            </div>

            {/* 按键列表 */}
            <div className="p-4 space-y-2">
              <Label className="text-xs text-muted-foreground">
                为每个按键绑定音效（支持 mp3/wav/ogg，单个不超过 500KB）
              </Label>

              {ALL_KEYS.filter((k) => k !== "Enter").map((key) => {
                const label = KEY_LABELS[key] || key.toUpperCase();
                const isBound = boundKeys.has(key);

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                      isBound ? "border-primary/30 bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="w-14 text-center text-sm font-bold">{label}</span>

                    {isBound ? (
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-xs text-primary">已绑定</span>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => onRemoveSound(key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex-1 flex items-center justify-center gap-1 cursor-pointer rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 transition-colors">
                        {uploading === key ? "上传中..." : (
                          <><Upload className="h-3 w-3" /> 上传音效</>
                        )}
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(key, e)}
                          disabled={uploading !== null}
                        />
                      </label>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                <span className="w-14 text-center text-sm font-bold">ENTER</span>
                <span className="text-xs text-muted-foreground">停止所有音效（固定功能）</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
