import { useEffect, useImperativeHandle, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { zh } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./block-note-editor.css";

export interface BlockNoteEditorHandle {
  /**
   * 若存在尚未导出的编辑内容，立即导出并触发 onChange，返回最新 markdown；
   * 否则返回 null（外部 value 即最新内容）。
   */
  flush: () => string | null;
}

interface BlockNoteEditorProps {
  /** 受控 markdown 字符串（与博客草稿的 markdown 字段一一对应） */
  value: string;
  /** 防抖导出的 markdown 回写 */
  onChange: (markdown: string) => void;
  /** 图片上传（粘贴/拖拽/插入图片 block 时调用），返回内容图片 URL */
  uploadImage?: (file: File) => Promise<string>;
  /** 暴露 flush 句柄，供保存前取回最新正文 */
  ref?: React.Ref<BlockNoteEditorHandle | null>;
}

/**
 * BlockNote 受控封装：value = markdown 字符串，onChange = 防抖导出 markdown。
 * 外部 value 变化（图片上传追加等）会重新导入编辑器；编辑器导出经 lastSyncedRef
 * 防止回环。父组件须用文档 id 作为 key 挂载，切换文档时重建实例。
 *
 * 主题固定 light：内容后台（content-admin.css）是固定纸色外观，不随根元素
 * dark class 变化，编辑器若跟随系统暗色会在纸色页面上变成黑底深字。
 */
export function BlockNoteEditor({ value, onChange, uploadImage, ref }: BlockNoteEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useCreateBlockNote({
    dictionary: zh,
    uploadFile: uploadImage
      ? (file) => uploadImage(file)
      : undefined
  });

  const dirtyRef = useRef(false);
  // 初始时编辑器是空实例，lastSyncedRef 必须从空串起算，否则挂载时的首次导入会被短路
  const lastSyncedRef = useRef("");
  const importingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  function exportNow(): string {
    dirtyRef.current = false;
    const markdown = editor.blocksToMarkdownLossy();
    lastSyncedRef.current = markdown;
    onChangeRef.current(markdown);
    return markdown;
  }

  function scheduleExport() {
    dirtyRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      exportNow();
    }, 200);
  }

  // 外部 value 变化（初始加载 / 侧栏上传图片追加 markdown）→ 导入编辑器
  useEffect(() => {
    if (value === lastSyncedRef.current) return;
    const blocks = editor.tryParseMarkdownToBlocks(value);
    lastSyncedRef.current = value;
    dirtyRef.current = false;
    importingRef.current = true;
    try {
      editor.replaceBlocks(
        editor.document,
        blocks.length > 0 ? blocks : [{ type: "paragraph" }]
      );
    } finally {
      importingRef.current = false;
    }
  }, [editor, value]);

  // 卸载时冲刷未导出的编辑，避免切换文档丢失最后 200ms 的输入
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (dirtyRef.current) exportNow();
    },
    [editor]
  );

  useImperativeHandle(ref, () => ({
    flush: () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return dirtyRef.current ? exportNow() : null;
    }
  }));

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="content-blocknote"
      onChange={() => {
        if (!importingRef.current) scheduleExport();
      }}
    />
  );
}
