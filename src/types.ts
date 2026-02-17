export interface NodeLink {
  label: string;
  url: string;
}

export interface NodeMetadata {
  title: string;
  description: string;
  links?: NodeLink[];
  codeSnippet?: string;
}

export interface WalkthroughDiagram {
  code: string;
  summary: string;
  nodes: Record<string, NodeMetadata>;
  githubRepo?: string;
  githubRef?: string;
  createdAt?: string;
}

export interface TraverseConfig {
  shareServerUrl: string;
  port: number;
  mode: "local" | "server";
}
