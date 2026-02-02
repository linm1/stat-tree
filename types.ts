
export interface SASExample {
  title: string;
  code: string;
  description?: string;
}

export interface DecisionNode {
  id: string;
  question: string;
  description?: string;
  options?: {
    label: string;
    description?: string;
    nextNodeId: string;
  }[];
  result?: {
    procedures: string[];
    briefing: string;
    examples: SASExample[];
    table?: {
      headers: string[];
      rows: string[][];
    };
  };
}

export interface TreeData {
  [key: string]: DecisionNode;
}

/**
 * Expansion State Interface (Phase 1)
 * Tracks which nodes are expanded/collapsed
 */
export interface ExpansionState {
  expandedNodes: Set<string>;      // IDs of nodes that are expanded
  collapsedSubtrees: Set<string>;  // IDs of collapsed parent nodes
}
