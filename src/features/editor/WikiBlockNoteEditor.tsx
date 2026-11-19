import { useEffect, useImperativeHandle, useRef } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { zh } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote
} from "@blocknote/react";
import { blockNoteToWiki, wikiToBlockNote, type SchemaBlock } from "@/features/wiki/wiki-blocknote-convert";
import { WikiEditorContext, wikiSchema, type WikiEditorDeps } from "@/features/wiki/wiki-blocknote-schema";
import type { WikiBlock } from "@/types/wiki";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./wiki-blocknote-editor.css";

export interface WikiBlockNoteEditorHandle {
  /** 若存在未导出的编辑内容，立即导出并触发 onChange，返回最新 WikiBlock[]；否则返回 null */
  flush: () => WikiBlock[] | null;
}

interface WikiBlockNoteEditorProps {
  /** 受控 WikiBlock[]（与 wikiDraft.content 一一对应，存储格式零改动） */
  value: WikiBlock[];
  onChange: (blocks: WikiBlock[]) => void;
  /** 行内/块编辑面板需要的候选（PL 列表、词条列表） */
  deps: WikiEditorDeps;
  uploadImage?: (file: File) => Promise<string>;
  /** 暴露 flush 句柄，供保存前取回最新正文 */
  ref?: React.Ref<WikiBlockNoteEditorHandle | null>;
}

/**
 * Wiki 正文的 BlockNote 所见即所得编辑器（二期）。
 * value = WikiBlock[]（存储格式），经 wiki-blocknote-convert 双向转换；
 * 防抖导出 + lastSyncedRef 防回环 + flush 句柄，骨架与博客版 BlockNoteEditor 一致。
 * 父组件须用词条 id 作为 key 挂载，切换词条时重建实例。
 */
export function WikiBlockNoteEditor({ value, onChange, deps, uploadImage, ref }: WikiBlockNoteEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useCreateBlockNote({
    schema: wikiSchema,
    dictionary: zh,
    uploadFile: uploadImage ? (file) => uploadImage(file) : undefined
  });

  const dirtyRef = useRef(false);
  // JSON 快照作为相等比较（WikiBlock[] 是对象数组）；初始编辑器为空文档
  const lastSyncedRef = useRef("[]");
  const importingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  function exportNow(): WikiBlock[] {
    dirtyRef.current = false;
    const blocks = blockNoteToWiki(editor.document);
    lastSyncedRef.current = JSON.stringify(blocks);
    onChangeRef.current(blocks);
    return blocks;
  }

  function scheduleExport() {
    dirtyRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      exportNow();
    }, 200);
  }

  // 外部 value 变化（侧栏上传图片追加 image block 等）→ 导入编辑器
  useEffect(() => {
    const valueJson = JSON.stringify(value);
    if (valueJson === lastSyncedRef.current) return;
    lastSyncedRef.current = valueJson;
    dirtyRef.current = false;
    const blocks = wikiToBlockNote(value);
    importingRef.current = true;
    try {
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks as SchemaBlock[]);
      }
      // blocks 为空时保持编辑器默认空段（BN 的 replaceBlocks 不接受空数组）
    } finally {
      importingRef.current = false;
    }
  }, [editor, value]);

  // 卸载时冲刷未导出的编辑，避免切换词条丢失最后 200ms 的输入
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
    <WikiEditorContext.Provider value={deps}>
      <BlockNoteView
        editor={editor}
        theme="light"
        className="content-blocknote wiki-blocknote"
        onChange={() => {
          if (!importingRef.current) scheduleExport();
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                {
                  title: "隐藏块",
                  subtext: "加密档案：playerIds 可见，支持嵌套",
                  aliases: ["secret", "隐藏", "加密"],
                  group: "Wiki",
                  onItemClick: () => {
                    editor.insertBlocks(
                      [{ type: "secretPanel", props: { title: "", playerIds: "", hiddenMode: "mask" } }],
                      editor.getTextCursorPosition().block.id,
                      "after"
                    );
                  }
                },
                {
                  title: "COC 人物卡",
                  subtext: "属性 / 技能 / 成长记录",
                  aliases: ["coc", "人物卡", "卡"],
                  group: "Wiki",
                  onItemClick: () => {
                    editor.insertBlocks(
                      [{ type: "cocSheet", props: { cocData: "{}" } }],
                      editor.getTextCursorPosition().block.id,
                      "after"
                    );
                  }
                }
              ],
              query
            )
          }
        />
      </BlockNoteView>
    </WikiEditorContext.Provider>
  );
}
