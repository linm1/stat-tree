
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
