export interface ModuleClueReviewModule {
  id: string;
  name: string;
}

export interface ModuleClueReviewClue {
  id: string;
  title: string;
  summary?: string;
  detail?: string;
  tags: string[];
  thumbnail?: string;
  order: number;
  isInitial?: boolean;
  reveals: string[];
  revealReasons?: Record<string, string>;
  visiblePlayerIds?: string[];
}

export interface ModuleClueReviewEdge {
  id: string;
  source: string;
  target: string;
  reason?: string;
}

export interface ModuleClueReviewData {
  module: ModuleClueReviewModule;
  clues: ModuleClueReviewClue[];
  edges: ModuleClueReviewEdge[];
  tags: string[];
}

export interface ModuleClueReviewColumn {
  index: number;
  clues: ModuleClueReviewClue[];
}

export interface ModuleClueReviewLayout {
  columns: ModuleClueReviewColumn[];
  columnByClueId: Map<string, number>;
  rowByClueId: Map<string, number>;
}

export type HighlightSelection =
  | { type: "none" }
  | { type: "tag"; tag: string }
  | { type: "clue"; clueId: string };

export interface HighlightState {
  highlightedClueIds: Set<string>;
  highlightedEdgeIds: Set<string>;
}

export interface VisibleOutgoingEdge extends ModuleClueReviewEdge {
  targetClue: ModuleClueReviewClue;
}

function compareClues(left: ModuleClueReviewClue, right: ModuleClueReviewClue) {
  return left.order - right.order || left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

export function getVisibleClueGraph(
  data: ModuleClueReviewData,
  visibleClueIds: Set<string>,
): ModuleClueReviewData {
  const clues = data.clues.filter((clue) => visibleClueIds.has(clue.id));
  const visibleIds = new Set(clues.map((clue) => clue.id));
  const edges = data.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const tags = Array.from(new Set(clues.flatMap((clue) => clue.tags)));

  return {
    module: data.module,
    clues,
    edges,
    tags,
  };
}

export function getVisibleOutgoingEdges(
  data: ModuleClueReviewData,
  clueId: string,
): VisibleOutgoingEdge[] {
  const clueById = new Map(data.clues.map((clue) => [clue.id, clue]));
  return data.edges
    .filter((edge) => edge.source === clueId)
    .map((edge) => {
      const targetClue = clueById.get(edge.target);
      return targetClue ? { ...edge, targetClue } : null;
    })
    .filter((edge): edge is VisibleOutgoingEdge => edge !== null);
}

export function buildClueReviewLayout(data: ModuleClueReviewData): ModuleClueReviewLayout {
  const clueById = new Map(data.clues.map((clue) => [clue.id, clue]));
  const incoming = new Map<string, string[]>();
  for (const clue of data.clues) incoming.set(clue.id, []);
  for (const edge of data.edges) {
    if (!clueById.has(edge.source) || !clueById.has(edge.target)) continue;
    incoming.get(edge.target)?.push(edge.source);
  }

  const visiting = new Set<string>();
  const columnByClueId = new Map<string, number>();

  function columnFor(clueId: string): number {
    const cached = columnByClueId.get(clueId);
    if (cached !== undefined) return cached;
    if (visiting.has(clueId)) return 0;

    visiting.add(clueId);
    const parents = incoming.get(clueId) ?? [];
    const parentColumns = parents.map((parentId) => columnFor(parentId));
    const column = parentColumns.length > 0 ? Math.max(...parentColumns) + 1 : 0;
    visiting.delete(clueId);
    columnByClueId.set(clueId, column);
    return column;
  }

  for (const clue of data.clues) columnFor(clue.id);

  const columns = new Map<number, ModuleClueReviewClue[]>();
  for (const clue of data.clues) {
    const column = columnByClueId.get(clue.id) ?? 0;
    columns.set(column, [...(columns.get(column) ?? []), clue]);
  }

  const sortedColumns = Array.from(columns.entries())
    .sort(([left], [right]) => left - right)
    .map(([index, clues]) => ({ index, clues: clues.sort(compareClues) }));
  const maxColumnSize = Math.max(1, ...sortedColumns.map((column) => column.clues.length));
  const rowByClueId = new Map<string, number>();
  for (const column of sortedColumns) {
    const count = column.clues.length;
    column.clues.forEach((clue, index) => {
      const row = count >= maxColumnSize ? index : Math.floor((index * maxColumnSize) / count);
      rowByClueId.set(clue.id, row);
    });
  }

  return {
    columnByClueId,
    rowByClueId,
    columns: sortedColumns,
  };
}

function collectDownstream(data: ModuleClueReviewData, startIds: Iterable<string>): Set<string> {
  const nextBySource = new Map<string, string[]>();
  for (const edge of data.edges) {
    nextBySource.set(edge.source, [...(nextBySource.get(edge.source) ?? []), edge.target]);
  }

  const result = new Set<string>();
  const queue = Array.from(startIds);
  while (queue.length > 0) {
    const clueId = queue.shift();
    if (!clueId || result.has(clueId)) continue;
    result.add(clueId);
    for (const nextId of nextBySource.get(clueId) ?? []) queue.push(nextId);
  }
  return result;
}

export function getHighlightState(
  data: ModuleClueReviewData,
  selection: HighlightSelection,
): HighlightState {
  if (selection.type === "none") {
    return { highlightedClueIds: new Set(), highlightedEdgeIds: new Set() };
  }

  const startIds = selection.type === "tag"
    ? data.clues.filter((clue) => clue.tags.includes(selection.tag)).map((clue) => clue.id)
    : [selection.clueId];
  const highlightedClueIds = collectDownstream(data, startIds);
  const highlightedEdgeIds = new Set(
    data.edges
      .filter((edge) => highlightedClueIds.has(edge.source) && highlightedClueIds.has(edge.target))
      .map((edge) => edge.id),
  );

  return { highlightedClueIds, highlightedEdgeIds };
}
