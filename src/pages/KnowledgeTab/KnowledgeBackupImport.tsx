import { useEffect, useRef, useState, type FormEvent } from "react";
import { knowledgeErrorMessage, type KnowledgeClient, type World, type WorldExport } from "@/features/knowledge/knowledge-client";

const maxBackupBytes = 8 * 1024 * 1024;

export function KnowledgeBackupImport({ api, onImported, onClose }: {
  api: KnowledgeClient;
  onImported: (world: World) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [backup, setBackup] = useState<WorldExport>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function readBackup(file: File | undefined) {
    setBackup(undefined);
    setName("");
    setError("");
    if (!file) return;
    if (file.size > maxBackupBytes) {
      setError("备份文件超过 8 MiB。");
      return;
    }
    setBusy(true);
    try {
      const data = JSON.parse(await file.text()) as Partial<WorldExport> | null;
      if (data?.version !== 1 || typeof data.world?.name !== "string" || !Array.isArray(data.documents) || !Array.isArray(data.relations)) {
        throw new Error("文件格式与世界观备份不匹配。");
      }
      setBackup(data as WorldExport);
      setName(data.world.name);
    } catch {
      setError("无法读取备份。请选择从知识库导出的 JSON 文件。");
    } finally {
      setBusy(false);
    }
  }

  async function restore(event: FormEvent) {
    event.preventDefault();
    if (!backup || busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      onImported(await api.importWorld(name.trim(), backup));
    } catch (cause) {
      setError(knowledgeErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className="knowledge knowledge-dialog" aria-labelledby="kb-restore-title" onCancel={(event) => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <form className="kb-stack" onSubmit={restore}>
      <div className="kb-row kb-between">
        <h2 id="kb-restore-title">导入世界观备份</h2>
        <button type="button" disabled={busy} onClick={onClose}>关闭</button>
      </div>
      <label>选择备份文件<input type="file" accept=".json,application/json" disabled={busy}
        onChange={(event) => void readBackup(event.target.files?.[0])} /></label>
      {backup && <>
        <label>新世界观名称<input required maxLength={100} disabled={busy} value={name}
          onChange={(event) => setName(event.target.value)} /></label>
        <p>将 {backup.documents.length} 篇文章与 {backup.relations.length} 条关系恢复到新世界观。导入的内容为私有。</p>
      </>}
      {error && <p className="kb-error" role="alert">{error}</p>}
      <button className="kb-primary kb-start" disabled={busy || !backup || !name.trim()}>确认导入</button>
    </form>
  </dialog>;
}
