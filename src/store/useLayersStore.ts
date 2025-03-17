import { create } from "zustand";
import type {
	DockerLayer,
	FileItem,
	DockerImageInfo,
	DockerfileAnalysis,
	DockerImage,
} from "../utils/types";
import type { TreeNode } from "../components/TreeView";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface TaskStatus {
	message: string;
	progress: number; // 0.0 to 1.0
	isComplete: boolean;
	error?: string | null;
}

export interface LayersState {
	// Docker image and layers
	dockerImage: DockerImageInfo | null;
	selectedLayerId: string | null;
	selectedLayerNumber: number | null;
	selectedFile: FileItem | null;

	// Available Docker images
	availableImages: DockerImage[];
	isLoadingImages: boolean;
	selectedImageId: string | null;

	// Dockerfile content and analysis
	dockerfileContent: string;
	analysis: DockerfileAnalysis | null;

	// Tree view data
	treeViewData: TreeNode[];
	selectedTreeNodeId: string | null;

	// UI state
	isLoading: boolean;
	error: string | null;
	darkMode: boolean;

	// Task status
	taskStatus: TaskStatus | null;

	// Layer files
	selectedLayerFiles: FileItem[];
	isLoadingLayerFiles: boolean;
	loadingDirectories: Set<string>; // Track which directories are currently being loaded

	// File content state
	selectedFileContent: string;
	isLoadingFileContent: boolean;

	// Comparison state
	isComparisonMode: boolean;
	selectedLayersForComparison: string[];
	isComparing: boolean;
	comparisonResult: {
		added: string[];
		removed: string[];
		modified: string[];
		unchanged: string[];
	} | null;

	// Actions
	setDockerImage: (image: DockerImageInfo | null) => void;
	setSelectedLayerId: (id: string | null) => void;
	setSelectedLayerNumber: (number: number | null) => void;
	setSelectedFile: (file: FileItem | null) => void;
	setDockerfileContent: (content: string) => void;
	setAnalysis: (analysis: DockerfileAnalysis | null) => void;
	setTreeViewData: (data: TreeNode[]) => void;
	setSelectedTreeNodeId: (id: string | null) => void;
	setIsLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	toggleDarkMode: () => void;
	setTaskStatus: (status: TaskStatus | null) => void;

	// Docker images actions
	setAvailableImages: (images: DockerImage[]) => void;
	setSelectedImageId: (id: string | null) => void;
	fetchAvailableImages: () => Promise<void>;

	// Docker layer actions
	selectImageAndProcessLayers: (imageId: string) => Promise<void>;

	// Layer files actions
	exportSingleLayer: (layerId: string) => Promise<void>;
	getLayerFiles: (layerId: string) => Promise<void>;
	extractDirectory: (dirPath: string) => Promise<void>; // New function to extract a directory on demand
	setSelectedLayerFiles: (files: FileItem[]) => void;

	// File content actions
	setSelectedFileContent: (content: string) => void;
	loadFileContent: (file: FileItem) => Promise<void>;

	// Comparison actions
	setIsComparisonMode: (isComparisonMode: boolean) => void;
	toggleComparisonMode: () => void;
	setSelectedLayersForComparison: (layers: string[]) => void;
	addLayerForComparison: (layerId: string) => void;
	removeLayerForComparison: (layerId: string) => void;
	clearLayersForComparison: () => void;
	setIsComparing: (isComparing: boolean) => void;
	setComparisonResult: (
		result: {
			added: string[];
			removed: string[];
			modified: string[];
			unchanged: string[];
		} | null,
	) => void;
	compareLayers: () => Promise<{
		added: string[];
		removed: string[];
		modified: string[];
		unchanged: string[];
	} | null>;
}

const useLayersStore = create<LayersState>((set, get) => ({
	// Initial state
	dockerImage: null,
	selectedLayerId: null,
	selectedLayerNumber: null,
	selectedFile: null,
	dockerfileContent: "",
	analysis: null,
	treeViewData: [],
	selectedTreeNodeId: null,
	isLoading: false,
	error: null,
	darkMode: false,
	taskStatus: null,

	// Docker images state
	availableImages: [],
	isLoadingImages: false,
	selectedImageId: null,

	// Layer files
	selectedLayerFiles: [],
	isLoadingLayerFiles: false,
	loadingDirectories: new Set<string>(),

	// File content state
	selectedFileContent: "",
	isLoadingFileContent: false,

	// Comparison state
	isComparisonMode: false,
	selectedLayersForComparison: [],
	isComparing: false,
	comparisonResult: null,

	// Actions
	setDockerImage: (image) => set({ dockerImage: image }),
	setSelectedLayerId: (id) => set({ selectedLayerId: id }),
	setSelectedLayerNumber: (number) => set({ selectedLayerNumber: number }),
	setSelectedFile: (file) => set({ selectedFile: file }),
	setDockerfileContent: (content) => {
		console.log(
			`Store: Setting dockerfile content: ${content ? `${content.substring(0, 30)}...` : "empty"}`,
		);
		console.log(`Store: Content length: ${content?.length || 0}`);
		set({ dockerfileContent: content });
		console.log(
			`Store: After set, content length: ${get().dockerfileContent?.length || 0}`,
		);
	},
	setAnalysis: (analysis) => set({ analysis: analysis }),
	setTreeViewData: (data) => set({ treeViewData: data }),
	setSelectedTreeNodeId: (id) => set({ selectedTreeNodeId: id }),
	setIsLoading: (isLoading) => set({ isLoading }),
	setError: (error) => set({ error }),
	toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
	setTaskStatus: (status) => set({ taskStatus: status }),

	// Docker images actions
	setAvailableImages: (images) => set({ availableImages: images }),
	setSelectedImageId: (id) => set({ selectedImageId: id }),
	fetchAvailableImages: async () => {
		try {
			set({ isLoadingImages: true, error: null });
			// Call Tauri command to get Docker images
			const images = await invoke<DockerImage[]>("get_docker_images");
			set({ availableImages: images, isLoadingImages: false });
			return;
		} catch (error) {
			console.error("Error fetching Docker images:", error);
			set({
				error:
					typeof error === "string" ? error : "Failed to fetch Docker images",
				isLoadingImages: false,
			});
		}
	},

	// Docker layer actions
	selectImageAndProcessLayers: async (imageId) => {
		try {
			if (!imageId) {
				console.error("Cannot process image: Image ID is empty or null");
				return;
			}

			console.log("Processing image with ID:", imageId);
			console.log("Image ID type:", typeof imageId);
			console.log("Image ID length:", imageId.length);

			// Clear any existing layer state
			set({
				selectedLayerId: null,
				selectedLayerNumber: null,
				selectedLayerFiles: [],
				selectedFile: null,
				selectedFileContent: "",
				isLoading: true,
				error: null,
				selectedImageId: imageId,
				taskStatus: {
					message: "Starting image processing...",
					progress: 0,
					isComplete: false,
					error: null,
				},
			});

			// Step 1: Retag the image
			set({
				taskStatus: {
					message: "Tagging image with 'layers' tag...",
					progress: 0.1,
					isComplete: false,
					error: null,
				},
			});

			try {
				const tagResult = await invoke<string>("retag_image_for_layers", {
					imageId,
				});
				console.log("Tag result:", tagResult);
			} catch (tagError) {
				console.error("Error tagging image:", tagError);
				set({
					error:
						typeof tagError === "string" ? tagError : "Failed to tag image",
					isLoading: false,
					taskStatus: {
						message: "Error tagging image",
						progress: 0,
						isComplete: true,
						error: typeof tagError === "string" ? tagError : "Unknown error",
					},
				});
				return;
			}

			// Set up listener for task status updates
			const unlisten = await listen<TaskStatus>("task_status", (event) => {
				console.log("Task status update:", event.payload);
				set({ taskStatus: event.payload });

				// If the task is complete, we can clean up
				if (event.payload.isComplete) {
					unlisten();
				}
			});

			// Step 2: Export the layers
			try {
				const imageInfo = await invoke<DockerImageInfo>("export_image_layers");
				console.log("Image info received:", imageInfo);

				// Update the store with the image info
				set({
					dockerImage: imageInfo,
					isLoading: false,
					taskStatus: {
						message: "Layer processing completed successfully",
						progress: 1.0,
						isComplete: true,
						error: null,
					},
				});
			} catch (exportError) {
				console.error("Error exporting image layers:", exportError);
				set({
					error:
						typeof exportError === "string"
							? exportError
							: "Failed to export image layers",
					isLoading: false,
					taskStatus: {
						message: "Error exporting image layers",
						progress: 0,
						isComplete: true,
						error:
							typeof exportError === "string" ? exportError : "Unknown error",
					},
				});
			}

			return;
		} catch (error) {
			console.error("Error processing image layers:", error);
			set({
				error:
					typeof error === "string" ? error : "Failed to process image layers",
				isLoading: false,
				taskStatus: {
					message: "Error processing image layers",
					progress: 0,
					isComplete: true,
					error: typeof error === "string" ? error : "Unknown error",
				},
			});
		}
	},

	// Layer files actions
	exportSingleLayer: async (layerId) => {
		try {
			if (!layerId) {
				console.error("Cannot export layer: Layer ID is empty or null");
				return;
			}

			console.log("Exporting layer with ID:", layerId);

			// Extract layer number if it's in the format "layer_X"
			let layerNumber: number | null = null;
			if (layerId.startsWith("layer_")) {
				const numberStr = layerId.substring(6); // Remove "layer_" prefix
				layerNumber = Number.parseInt(numberStr, 10);
				if (Number.isNaN(layerNumber)) {
					layerNumber = null;
				}
			}

			// Set the selected layer ID and number
			set({
				selectedLayerId: layerId,
				selectedLayerNumber: layerNumber,
				isLoading: true,
				error: null,
				taskStatus: {
					message: "Exporting layer...",
					progress: 0,
					isComplete: false,
					error: null,
				},
			});

			// Always use the generic layer ID for the backend call
			const files = await invoke<FileItem[]>("export_single_layer", {
				layerId,
			});

			console.log("Received files from export_single_layer:", files.length);

			set({
				selectedLayerFiles: files,
				isLoading: false,
				taskStatus: {
					message: "Layer exported successfully",
					progress: 1.0,
					isComplete: true,
					error: null,
				},
			});

			// Also load the files for this layer
			await get().getLayerFiles("current_layer");
		} catch (error) {
			console.error("Error exporting layer:", error);
			set({
				error: typeof error === "string" ? error : "Failed to export layer",
				isLoading: false,
				taskStatus: {
					message: "Error exporting layer",
					progress: 0,
					isComplete: true,
					error: typeof error === "string" ? error : "Unknown error",
				},
			});
		}
	},

	getLayerFiles: async (layerId) => {
		try {
			// Always use the generic layer name
			const genericLayerId = "current_layer";

			console.log("Getting files for layer with ID:", layerId);
			console.log("Using generic layer ID:", genericLayerId);

			set({
				isLoadingLayerFiles: true,
				// Ensure the selectedLayerId is set to the original layerId
				selectedLayerId: layerId,
			});

			const files = await invoke<FileItem[]>("get_layer_files", {
				layerId: genericLayerId,
			});

			console.log("Received files from get_layer_files:", files);
			console.log("Number of files:", files.length);

			set({
				selectedLayerFiles: files,
				isLoadingLayerFiles: false,
			});
		} catch (error) {
			console.error("Error getting layer files:", error);
			set({
				selectedLayerFiles: [],
				isLoadingLayerFiles: false,
				error: typeof error === "string" ? error : "Failed to get layer files",
			});
		}
	},

	extractDirectory: async (dirPath) => {
		try {
			const { selectedLayerId, selectedLayerFiles } = get();

			if (!selectedLayerId) {
				console.error("Cannot extract directory: No layer selected");
				return;
			}

			console.log(`Extracting directory: ${dirPath}`);

			// Add the directory to the loading set
			set((state) => ({
				loadingDirectories: new Set(state.loadingDirectories).add(dirPath),
			}));

			// Call the backend to extract the directory
			const files = await invoke<FileItem[]>("extract_directory", {
				dirPath,
				layerId: selectedLayerId,
			});

			console.log(`Extracted directory, received ${files.length} files`);

			// Merge the new files with the existing files
			// First, remove any existing files for this directory
			const updatedFiles = selectedLayerFiles.filter((file) => {
				// Keep files that are not in the extracted directory
				return !file.path.startsWith(dirPath) || file.path === dirPath;
			});

			// Then add the new files
			updatedFiles.push(...files);

			// Update the store
			set({
				selectedLayerFiles: updatedFiles,
				loadingDirectories: new Set(
					[...get().loadingDirectories].filter((d) => d !== dirPath),
				),
			});

			console.log(`Updated files, now have ${updatedFiles.length} files`);
		} catch (error) {
			console.error("Error extracting directory:", error);
			set({
				error:
					typeof error === "string" ? error : "Failed to extract directory",
				loadingDirectories: new Set(
					[...get().loadingDirectories].filter((d) => d !== dirPath),
				),
			});
		}
	},

	setSelectedLayerFiles: (files) => {
		set({ selectedLayerFiles: files });
	},

	// File content actions
	setSelectedFileContent: (content) => set({ selectedFileContent: content }),

	loadFileContent: async (file) => {
		if (!file) return;

		// Don't load content for directories
		if (file.is_dir) return;

		set({ isLoadingFileContent: true });

		try {
			// Call the backend to read the file content
			console.log(`Reading file content for: ${file.path}`);

			try {
				// Call the Rust backend function to read the file
				const content = await invoke<string>("read_layer_file", {
					filePath: file.path,
				});

				set({
					selectedFileContent: content,
					isLoadingFileContent: false,
				});
			} catch (error) {
				console.error("Error reading file from backend:", error);

				// Set error message as content
				set({
					selectedFileContent: `Error reading file: ${error}`,
					isLoadingFileContent: false,
					error:
						typeof error === "string" ? error : "Failed to read file content",
				});
			}
		} catch (error) {
			console.error("Error loading file content:", error);
			set({
				selectedFileContent: `Error loading file content: ${error}`,
				isLoadingFileContent: false,
				error:
					typeof error === "string" ? error : "Failed to load file content",
			});
		}
	},

	// Comparison actions
	setIsComparisonMode: (isComparisonMode) => set({ isComparisonMode }),
	toggleComparisonMode: () => {
		const isComparisonMode = get().isComparisonMode;
		set({
			isComparisonMode: !isComparisonMode,
			// Clear comparison state when toggling off
			...(isComparisonMode
				? {
						selectedLayersForComparison: [],
						comparisonResult: null,
					}
				: {}),
		});
	},
	setSelectedLayersForComparison: (layers) =>
		set({ selectedLayersForComparison: layers }),
	addLayerForComparison: (layerId) => {
		const { selectedLayersForComparison } = get();
		// Only allow selecting up to 2 layers
		if (selectedLayersForComparison.includes(layerId)) {
			// If already selected, do nothing
			return;
		}

		if (selectedLayersForComparison.length < 2) {
			// Add to selection if less than 2 layers selected
			set({
				selectedLayersForComparison: [...selectedLayersForComparison, layerId],
			});
		} else {
			// Replace the oldest selection if already have 2
			set({
				selectedLayersForComparison: [selectedLayersForComparison[1], layerId],
			});
		}
	},
	removeLayerForComparison: (layerId) => {
		const { selectedLayersForComparison } = get();
		set({
			selectedLayersForComparison: selectedLayersForComparison.filter(
				(id) => id !== layerId,
			),
		});
	},
	clearLayersForComparison: () => set({ selectedLayersForComparison: [] }),
	setIsComparing: (isComparing) => set({ isComparing }),
	setComparisonResult: (result) => set({ comparisonResult: result }),
	compareLayers: async () => {
		const { selectedLayersForComparison } = get();

		if (selectedLayersForComparison.length !== 2) {
			set({ error: "Please select exactly 2 layers to compare" });
			return null;
		}

		set({ isComparing: true, error: null });

		try {
			const result = await invoke<{
				added: string[];
				removed: string[];
				modified: string[];
				unchanged: string[];
			}>("compare_layers", {
				layer1Id: selectedLayersForComparison[0],
				layer2Id: selectedLayersForComparison[1],
			});

			set({
				comparisonResult: result,
				isComparing: false,
			});

			return result;
		} catch (error) {
			console.error("Error comparing layers:", error);
			set({
				error: typeof error === "string" ? error : "Failed to compare layers",
				isComparing: false,
			});
			return null;
		}
	},
}));

export default useLayersStore;
