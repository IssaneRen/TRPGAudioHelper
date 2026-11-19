import { BlockNoteSchema } from "@blocknote/core";
import {
  createReactBlockSpec,
  createReactInlineContentSpec,
  createReactStyleSpec
} from "@blocknote/react";
import { createContext, useContext, useState } from "react";
import type { CocSheetData, WikiIndexEntry, WikiPlayer } from "@/types/wiki";
import { CocSheetPanel } from "@/features/wiki/CocSheetPanel";
import { SelectionChips, type OptionItem } from "@/features/wiki/WikiBlockEditor";

/**
 * Wiki 编辑器的 BlockNote 自定义 schema（二期）。
 *
 * 存储仍是现有 WikiBlock[] JSON（见 wiki-blocknote-convert.ts 的双向转换）。
 * 编辑态 KP 全可见：阅读端的遮罩/权限过滤（WikiContentRenderer）不进编辑器，
 * 编辑器只维护结构信息（title / playerIds / hiddenMode / cocData 等）。
 *
 * propSchema 只支持 string/number/boolean，因此数组类字段（playerIds）
 * 以逗号分隔字符串存储，由转换层 join/split。
 */

export interface WikiEditorDeps {
  players: WikiPlayer[];
  entries: WikiIndexEntry[];
}

export const WikiEditorContext = createContext<WikiEditorDeps>({
  players: [],
  entries: []
});

export function useWikiEditorDeps(): WikiEditorDeps {
  return useContext(WikiEditorContext);
}

/* ---------------------------------- 样式 ---------------------------------- */

/** wiki text token 的 hex 颜色，保真往返（BlockNote 默认 textColor 是预设色板，不收 hex） */
export const hexTextColor = createReactStyleSpec(
  { type: "hexTextColor", propSchema: "string" },
  {
    render: ({ value, contentRef }) => (
      <span ref={contentRef} style={{ color: value || undefined }} />
    )
  }
);

/* -------------------------------- 行内内容 -------------------------------- */

function InlineEditPopover({
  label,
  children
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="wiki-inline-edit-root">
      <button
        type="button"
        className="wiki-inline-edit-trigger"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        {label}
      </button>
      {open ? (
        <span className="wiki-inline-edit-panel" onClick={(event) => event.stopPropagation()}>
          {children(() => setOpen(false))}
        </span>
      ) : null}
    </span>
  );
}

const wikiRefSpec = createReactInlineContentSpec(
  {
    type: "wikiRef",
    propSchema: {
      entryId: { default: "" },
      label: { default: "" }
    },
    content: "none"
  },
  {
    render: ({ inlineContent, updateInlineContent }) => {
      const entryId = inlineContent.props.entryId;
      const label = inlineContent.props.label;
      return (
        <span className="wiki-inline-ref">
          <span className="wiki-inline-ref__chip" title={`词条引用：${entryId || "未设置"}`}>
            🔗 {label || entryId || "未设置词条"}
          </span>
          <InlineEditPopover label="✏️">
            {(close) => (
              <RefEditPanel
                entryId={entryId}
                label={label}
                onChange={(next) => {
                  updateInlineContent({ type: "wikiRef", props: next });
                  close();
                }}
              />
            )}
          </InlineEditPopover>
        </span>
      );
    }
  }
);

function RefEditPanel({
  entryId,
  label,
  onChange
}: {
  entryId: string;
  label: string;
  onChange: (next: { entryId: string; label: string }) => void;
}) {
  const { entries } = useWikiEditorDeps();
  const options: OptionItem[] = entries.map((entry) => ({
    id: entry.id,
    label: `${entry.displayName}（${entry.id}）`
  }));
  return (
    <label className="wiki-inline-edit-form">
      <span>目标词条</span>
      <select value={entryId} onChange={(event) => onChange({ entryId: event.target.value, label })}>
        <option value="">（未设置）</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span>显示文案</span>
      <input
        value={label}
        onChange={(event) => onChange({ entryId, label: event.target.value })}
        placeholder="留空显示词条名"
      />
    </label>
  );
}

const wikiSecretSpec = createReactInlineContentSpec(
  {
    type: "wikiSecret",
    propSchema: {
      playerIds: { default: "" }
    },
    content: "plain"
  },
  {
    render: ({ inlineContent, updateInlineContent, contentRef }) => {
      const playerIds = (inlineContent.props.playerIds || "").split(",").filter(Boolean);
      return (
        <span className="wiki-inline-secret">
          <span className="wiki-inline-secret__chip">
            <span className="wiki-inline-secret__mark" title="隐藏行内（编辑态 KP 可见）">🔒</span>
            <span ref={contentRef} className="wiki-inline-secret__text" />
          </span>
          <InlineEditPopover label={`🔒${playerIds.length}`}>
            {(close) => (
              <PlayerIdsEditPanel
                title="可见 PL"
                values={playerIds}
                onChange={(next) => {
                  updateInlineContent({ type: "wikiSecret", props: { playerIds: next.join(",") } });
                  close();
                }}
              />
            )}
          </InlineEditPopover>
        </span>
      );
    }
  }
);

function PlayerIdsEditPanel({
  title,
  values,
  onChange
}: {
  title: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { players } = useWikiEditorDeps();
  const options: OptionItem[] = players.map((player) => ({
    id: player.id,
    label: `${player.displayName}（${player.id}）`
  }));
  return (
    <SelectionChips
      title={title}
      values={values}
      options={options}
      onToggle={(id) => {
        const next = values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
        onChange(next);
      }}
    />
  );
}

/* ---------------------------------- 块 ---------------------------------- */

const secretPanelSpec = createReactBlockSpec(
  {
    type: "secretPanel",
    propSchema: {
      title: { default: "" },
      playerIds: { default: "" },
      hiddenMode: { default: "mask", values: ["mask", "collapse"] }
    },
    content: "none"
  },
  {
    render: ({ block, editor }) => {
      const props = block.props;
      const playerIds = (props.playerIds || "").split(",").filter(Boolean);
      return (
        <div className="wiki-bn-secret-panel" data-hidden-mode={props.hiddenMode}>
          <div className="wiki-bn-secret-panel__head">
            <span className="wiki-bn-secret-panel__badge">🔒 隐藏块</span>
            <input
              className="wiki-bn-secret-panel__title"
              value={props.title}
              placeholder="加密档案标题"
              onChange={(event) =>
                editor.updateBlock(block, { props: { ...props, title: event.target.value } })
              }
            />
            <InlineEditPopover label={`🔒${playerIds.length}`}>
              {(close) => (
                <PlayerIdsEditPanel
                  title="可见 PL"
                  values={playerIds}
                  onChange={(next) => {
                    editor.updateBlock(block, {
                      props: { ...props, playerIds: next.join(",") }
                    });
                    close();
                  }}
                />
              )}
            </InlineEditPopover>
            <select
              className="wiki-bn-secret-panel__mode"
              value={props.hiddenMode}
              title="未授权时的呈现方式"
              onChange={(event) =>
                editor.updateBlock(block, {
                  props: { ...props, hiddenMode: event.target.value as "mask" | "collapse" }
                })
              }
            >
              <option value="mask">mask（保留黑色遮罩占位）</option>
              <option value="collapse">collapse（整块不渲染）</option>
            </select>
          </div>
          {/* children（子块）由编辑器自动渲染在下方 */}
        </div>
      );
    }
  }
);

const cocSheetSpec = createReactBlockSpec(
  {
    type: "cocSheet",
    propSchema: {
      cocData: { default: "{}" }
    },
    content: "none"
  },
  {
    render: ({ block, editor }) => {
      let cocData: CocSheetData | null = null;
      try {
        cocData = JSON.parse(block.props.cocData || "{}") as CocSheetData;
      } catch {
        cocData = null;
      }
      return (
        <div className="wiki-bn-coc-sheet">
          <InlineEditPopover label="✏️ 编辑数据">
            {(close) => (
              <CocDataEditPanel
                raw={block.props.cocData}
                onApply={(next) => {
                  editor.updateBlock(block, { props: { cocData: next } });
                  close();
                }}
              />
            )}
          </InlineEditPopover>
          <CocSheetPanel cocData={cocData} variant="full" showGrowthTooltip />
        </div>
      );
    }
  }
);

function CocDataEditPanel({
  raw,
  onApply
}: {
  raw: string;
  onApply: (nextJson: string) => void;
}) {
  const [text, setText] = useState(raw);
  const [error, setError] = useState("");
  return (
    <label className="wiki-coc-edit-form">
      <span>cocData JSON</span>
      <textarea
        value={text}
        rows={10}
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value);
          setError("");
        }}
      />
      {error ? <span className="wiki-coc-edit-form__error">{error}</span> : null}
      <button
        type="button"
        onClick={() => {
          try {
            const parsed = JSON.parse(text) as CocSheetData;
            onApply(JSON.stringify(parsed, null, 2));
          } catch {
            setError("JSON 无效，未应用。");
          }
        }}
      >
        应用
      </button>
    </label>
  );
}

/* --------------------------------- schema --------------------------------- */

export const wikiSchema = BlockNoteSchema.create().extend({
  styleSpecs: { hexTextColor },
  inlineContentSpecs: { wikiRef: wikiRefSpec, wikiSecret: wikiSecretSpec },
  // createReactBlockSpec 返回的是工厂（options 可选），extend 需要 BlockSpec 实例
  blockSpecs: { secretPanel: secretPanelSpec(), cocSheet: cocSheetSpec() }
});

export type WikiBlockNoteSchema = typeof wikiSchema;
