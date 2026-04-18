import Dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

export function getAutoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
    acyclicer: "greedy",
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 160, height: 80 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - 80,
        y: pos.y - 40,
      },
    };
  });
}
