export interface NodeLink {
  label: string;
  url: string;
}

export interface NodeMetadata {
  title: string;
  description: string;
  links?: NodeLink[];
  codeSnippet?: string;
  threadID?: string;
}

export interface WalkthroughDiagram {
  code: string;
  summary: string;
  nodes: Record<string, NodeMetadata>;
}
