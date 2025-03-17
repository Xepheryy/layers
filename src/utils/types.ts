// Define core type definitions for the application

export interface FileItem {
	name: string;
	path: string;
	is_dir: boolean;
	size: number;
	depth?: number;
	needs_loading?: boolean;
}

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

export type DockerImage = {
	id: string;
	repository: string;
	tag: string;
	created: string;
	size: string;
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
