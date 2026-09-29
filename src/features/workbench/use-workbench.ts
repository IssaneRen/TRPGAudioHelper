import { useCallback, useEffect, useState } from "react";
import { readWorkbench, saveWorkbench, type WorkbenchData } from "./workbench-client";
import { parseBackup } from "./workbench-model";

// Each save acknowledges only its own snapshot. Edits made during a request
// remain dirty and are sent by the next effect, never replaced by the response.
export function useWorkbench(token: string) {
  const [data, setData] = useState<WorkbenchData | null>(null);
  const [saved, setSaved] = useState<WorkbenchData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    readWorkbench(token).then(parseBackup).then((result) => {
      if (active) { setData(result); setSaved(result); setError(""); }
    }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : String(err)); });
    return () => { active = false; };
  }, [token, reload]);

  const dirty = data !== saved;
  useEffect(() => {
    if (!data || !dirty || busy || error) return;
    const snapshot = data;
    const timer = window.setTimeout(() => {
      setBusy(true);
      Promise.resolve().then(() => parseBackup(snapshot)).then(() => saveWorkbench(token, snapshot)).then(() => setSaved(snapshot))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setBusy(false));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [data, dirty, busy, error, token]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = useCallback((update: (current: WorkbenchData) => WorkbenchData) => {
    setData((current) => current ? update(current) : current);
  }, []);
  function retry() { setError(""); if (!data) setReload((count) => count + 1); }
  return { data, dirty, busy, error, change, retry };
}
