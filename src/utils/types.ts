// Define core type definitions for the application

export type FileItem = {
  name: string;
  type: 'file' | 'directory';
  size?: string;
  path: string;
};

export type DockerLayer = {
  id: string;
  name: string;
  command: string;
  size: string;
  createdAt: string;
  files: FileItem[];
};

export type DockerImageInfo = {
  id: string;
  name: string;
  created: string;
  size: string;
  layers: DockerLayer[];
};

export type DockerfileAnalysis = {
  layerImpact: Array<{
    lineNumber: number;
    instruction: string;
    impact: string;
  }>;
  optimizationSuggestions: Array<{
    title: string;
    description: string;
  }>;
};
