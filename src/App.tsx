import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import Header from "./components/Header";
import LayerInspector from "./components/LayerInspector";
import DockerfileEditor from "./components/DockerfileEditor";
import type { TreeNode } from "./components/TreeView";
// Settings component will be used in future implementations
import type { AppSettings } from "./components/Settings";
import type {
	DockerLayer,
	FileItem,
	DockerImageInfo,
	DockerfileAnalysis,
} from "./utils/types";
import "./App.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/Sidebar";

function App() {
	const [currentImageName, setCurrentImageName] = useState("");
	const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
	// Using _selectedFile pattern to indicate it's used internally by other components
	const [_selectedFile, setSelectedFile] = useState<FileItem | null>(null);
	const [dockerImage, setDockerImage] = useState<DockerImageInfo | null>(null);
	const [dockerfileContent, setDockerfileContent] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Analysis is passed to child components
	const [analysis, setAnalysis] = useState<DockerfileAnalysis | null>(null);
	// Added state for tree view
	const [treeViewData, setTreeViewData] = useState<TreeNode[]>([]);
	const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);
	// App settings state
	const [appSettings, setAppSettings] = useState<AppSettings>({
		darkMode: false,
		autoRefresh: true,
		cacheResults: true,
	});

	// Get selected layer and next layer for diff
	const selectedLayer =
		dockerImage?.layers.find((layer) => layer.id === selectedLayerId) || null;
	const selectedLayerIndex =
		dockerImage?.layers.findIndex((layer) => layer.id === selectedLayerId) ||
		-1;
	const nextLayer =
		selectedLayerIndex >= 0 &&
		selectedLayerIndex < (dockerImage?.layers.length || 0) - 1
			? dockerImage?.layers[selectedLayerIndex + 1]
			: null;

	const handleSelectDockerImage = async (imageName: string) => {
		try {
			setIsLoading(true);
			setError(null);
			setCurrentImageName(imageName);

			try {
				// Attempt to use the actual Tauri command
				const imageInfo = await invoke<DockerImageInfo>(
					"inspect_docker_image",
					{ imageName },
				);
				setDockerImage(imageInfo);

				if (imageInfo.layers.length > 0) {
					setSelectedLayerId(imageInfo.layers[0].id);
				}
			} catch (invokeError) {
				// If the Tauri command fails (during development), fall back to mock data
				console.warn("Tauri command failed, using mock data:", invokeError);
				await simulateInspectDockerImage(imageName);
			}

			setIsLoading(false);
		} catch (err) {
			setIsLoading(false);
			setError(
				`Error inspecting Docker image: ${err instanceof Error ? err.message : String(err)}`,
			);
			console.error(err);
		}
	};

	const handleUploadDockerfile = async (fileContent: string) => {
		setDockerfileContent(fileContent);

		try {
			// Try to analyze the uploaded Dockerfile
			const analysis = await invoke<DockerfileAnalysis>("analyze_dockerfile", {
				content: fileContent,
			});
			setAnalysis(analysis);
		} catch (err) {
			console.warn(
				"Failed to analyze Dockerfile with Tauri, using mock data:",
				err,
			);
			// Fall back to mock analysis during development
			await simulateAnalyzeDockerfile(fileContent);
		}
	};

	const handleAnalyzeDockerfile = async (content: string) => {
		try {
			setIsLoading(true);
			setError(null);

			try {
				// Attempt to use the actual Tauri command
				const analysisResult = await invoke<DockerfileAnalysis>(
					"analyze_dockerfile",
					{ content },
				);
				setAnalysis(analysisResult);
			} catch (invokeError) {
				// Fall back to mock data during development
				console.warn("Tauri command failed, using mock data:", invokeError);
				await simulateAnalyzeDockerfile(content);
			}

			setIsLoading(false);
		} catch (err) {
			setIsLoading(false);
			setError(
				`Error analyzing Dockerfile: ${err instanceof Error ? err.message : String(err)}`,
			);
			console.error(err);
		}
	};

	const handleSelectLayer = (layerId: string) => {
		setSelectedLayerId(layerId);
	};

	// Select file function can be used in future implementations
	const handleSelectFile = useCallback((file: FileItem) => {
		setSelectedFile(file);
	}, []);

	const handleDockerfileChange = (content: string) => {
		setDockerfileContent(content);
	};

	const handleSelectTreeNode = (node: TreeNode) => {
		setSelectedTreeNodeId(node.id);
		// If it's a file, also set the selected file for viewing
		if (node.type === "file") {
			setSelectedFile({
				name: node.name,
				type: node.type,
				size: node.size,
				path: node.path,
			});
		}
	};

	const handleSettingsChange = (newSettings: AppSettings) => {
		setAppSettings(newSettings);
		// Apply settings changes throughout the app
		// Save settings to local storage for persistence
		localStorage.setItem('appSettings', JSON.stringify(newSettings));
		document.documentElement.classList.toggle("dark", newSettings.darkMode);
	};

	// Create tree view data from docker layers
	const createTreeViewData = useCallback(() => {
		if (!dockerImage || !dockerImage.layers) return [];

		// Convert layers to tree nodes
		const treeNodes = dockerImage.layers.map((layer) => {
			// Create a directory structure
			const dirMap = new Map<string, TreeNode>();
			const rootDirs: TreeNode[] = [];

			// Process each file to build directory structure
			for (const file of layer.files) {
				const pathParts = file.path.split("/").filter(Boolean);
				let currentPath = "";

				// Create directory nodes for each level
				for (let i = 0; i < pathParts.length - 1; i++) {
					const part = pathParts[i];
					currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

					if (!dirMap.has(currentPath)) {
						const dirNode: TreeNode = {
							id: `${layer.id}-${currentPath}`,
							name: part,
							type: "directory" as const,
							path: currentPath,
							children: [],
						};
						dirMap.set(currentPath, dirNode);

						// Add to parent or root
						const parentPath = currentPath.substring(
							0,
							currentPath.lastIndexOf("/"),
						);
						if (parentPath) {
							const parent = dirMap.get(parentPath);
							if (parent?.children) {
								parent.children.push(dirNode);
							}
						} else {
							rootDirs.push(dirNode);
						}
					}
				}

				// Add file node
				if (file.type === "file") {
					const fileName = pathParts[pathParts.length - 1];
					const filePath = file.path;
					const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));

					const fileNode: TreeNode = {
						id: `${layer.id}-${filePath}`,
						name: fileName,
						type: "file" as const,
						path: filePath,
						size: file.size,
					};

					if (parentPath) {
						const parent = dirMap.get(parentPath);
						if (parent?.children) {
							parent.children.push(fileNode);
						}
					} else {
						rootDirs.push(fileNode);
					}
				}
			}
			// Create layer node with children
			return {
				id: layer.id,
				name: layer.name,
				type: "directory" as const,
				path: `/${layer.name}`,
				children: rootDirs,
			};
		});

		setTreeViewData(treeNodes);
	}, [dockerImage]);

	// Update tree view when docker image changes
	useEffect(() => {
		createTreeViewData();
	}, [createTreeViewData]);

	// Temporary function to simulate Dockerfile analysis
	// This will be replaced with actual Tauri commands
	const simulateAnalyzeDockerfile = useCallback(async (_content: string) => {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				// Create custom analysis for the example Dockerfile
				const mockAnalysis: DockerfileAnalysis = {
					layerImpact: [
						{
							lineNumber: 1,
							instruction: "FROM alpine:latest",
							impact: "Creates base layer from Alpine Linux (~5MB)",
						},
						{
							lineNumber: 4,
							instruction: "WORKDIR /app",
							impact: "Sets working directory for the container",
						},
						{
							lineNumber: 7,
							instruction: "ENV",
							impact: "Sets environment variables (negligible size impact)",
						},
						{
							lineNumber: 11,
							instruction: "VOLUME",
							impact: "Declares mount point for external data",
						},
						{
							lineNumber: 14,
							instruction: "EXPOSE",
							impact: "Informs container to listen on port 80",
						},
						{
							lineNumber: 17,
							instruction: "RUN",
							impact: "Creates new layer for user management (~1MB)",
						},
						{
							lineNumber: 22,
							instruction: "RUN",
							impact: "Creates new layer for curl installation (~3MB)",
						},
					],
					optimizationSuggestions: [
						{
							title: "Combine RUN commands",
							description:
								"Consider combining the user creation and curl installation into a single RUN command to reduce layers.",
						},
						{
							title: "Use multi-stage builds",
							description:
								"For real applications, consider multi-stage builds to keep the final image as small as possible.",
						},
						{
							title: "Use specific Alpine version",
							description:
								"Consider using a specific Alpine version tag instead of 'latest' for better reproducibility.",
						},
					],
				};

				setAnalysis(mockAnalysis);
				resolve();
			}, 800);
		});
	}, []);

	// Load the example Dockerfile from the project
	const loadExampleDockerfile = useCallback(async () => {
		try {
			setIsLoading(true);
			// This would use Tauri API in production
			const exampleDockerfileContent = `# Using Alpine Linux as the base image (~5MB vs ~72MB for Ubuntu)
FROM alpine:latest

# Working directory setup
WORKDIR /app

# Environment variable definition
ENV APP_NAME="MyApp"
ENV VERSION="1.0"

# Volume mount point declaration
VOLUME /data

# Port exposure
EXPOSE 80

# User management
RUN addgroup -g 1000 appgroup && \
    adduser -S -G appgroup -u 1000 appuser
USER appuser

# Single optimized RUN command for dependencies
RUN apk add --no-cache curl

# COPY command for static content
COPY config.json /config.json

# ADD command for remote content
ADD https://example.com/script.sh /script.sh

# CMD instruction for container startup
CMD ["ash", "-c", "/script.sh"]
`;

			setDockerfileContent(exampleDockerfileContent);
			await simulateAnalyzeDockerfile(exampleDockerfileContent);
			setIsLoading(false);
		} catch (err) {
			setError(`Failed to load example Dockerfile: ${err}`);
			setIsLoading(false);
		}
	}, [simulateAnalyzeDockerfile]);

	// Temporary function to simulate Docker image inspection
	// This will be replaced with actual Tauri commands
	const simulateInspectDockerImage = async (imageName: string) => {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				const mockLayers: DockerLayer[] = [
					{
						id: "sha256:a123456789",
						name: "Base Layer",
						command: "FROM node:16-alpine",
						size: "5.8 MB",
						createdAt: "2025-03-14T04:23:45Z",
						files: [
							{ name: "etc", type: "directory", path: "/etc" },
							{ name: "usr", type: "directory", path: "/usr" },
							{ name: "bin", type: "directory", path: "/bin" },
						],
					},
					{
						id: "sha256:b123456789",
						name: "Dependencies",
						command: "RUN npm install",
						size: "250 MB",
						createdAt: "2025-03-14T04:24:15Z",
						files: [
							{
								name: "node_modules",
								type: "directory",
								path: "/app/node_modules",
							},
							{
								name: "package-lock.json",
								type: "file",
								size: "250 KB",
								path: "/app/package-lock.json",
							},
						],
					},
					{
						id: "sha256:c123456789",
						name: "App",
						command: "COPY . .",
						size: "2.4 MB",
						createdAt: "2025-03-14T04:24:45Z",
						files: [
							{
								name: "index.js",
								type: "file",
								size: "4.5 KB",
								path: "/app/index.js",
							},
							{
								name: "app.js",
								type: "file",
								size: "12.3 KB",
								path: "/app/app.js",
							},
							{ name: "public", type: "directory", path: "/app/public" },
						],
					},
				];

				setDockerImage({
					id: "sha256:d123456789",
					name: imageName,
					created: "2025-03-14T04:25:00Z",
					size: "258.2 MB",
					layers: mockLayers,
				});

				setSelectedLayerId(mockLayers[0].id);
				resolve();
			}, 1000);
		});
	};

	// Effect to check Docker prerequisites when component mounts
	useEffect(() => {
		const checkDockerPrerequisites = async () => {
			// This will be implemented later with Tauri commands
			console.log("Checking for Docker prerequisites...");
		};

		checkDockerPrerequisites();

		// Load the example Dockerfile when component mounts
		loadExampleDockerfile();
	}, [loadExampleDockerfile]);

	// State for settings panel visibility
	const [showSettings, setShowSettings] = useState(false);

	return (
		<SidebarProvider>
			<div
				className={`flex flex-col h-screen overflow-hidden p-4 ${appSettings.darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
			>
				<Header
					onSelectDockerImage={handleSelectDockerImage}
					onUploadDockerfile={handleUploadDockerfile}
					currentImageName={currentImageName}
					onSettingsClick={() => setShowSettings(!showSettings)}
					isLoading={isLoading}
				/>

				{/* Error Banner */}
				{error && (
					<div
						className={`px-4 py-3 ${appSettings.darkMode ? "bg-red-900 text-red-100" : "bg-red-100 text-red-800"} flex items-center justify-between`}
					>
						<p>{error}</p>
						<button
							type="button"
							onClick={() => setError(null)}
							className={`rounded px-3 py-1 text-sm font-medium ${appSettings.darkMode ? "bg-red-800 hover:bg-red-700" : "bg-red-200 hover:bg-red-300"}`}
						>
							Dismiss
						</button>
					</div>
				)}

				{isLoading ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<div
								className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${appSettings.darkMode ? "border-blue-400" : "border-blue-500"} mx-auto`}
							/>
							<p
								className={`mt-2 ${appSettings.darkMode ? "text-gray-300" : "text-gray-600"}`}
							>
								Loading...
							</p>
						</div>
					</div>
				) : (
					<div className="flex-1 flex overflow-hidden rounded-lg border border-border shadow-sm no-divider sidebar-content-container">
						{/* Docker Layers Sidebar - First Column */}
						<AppSidebar 
							className="!border-none !border-r-0 shadow-none no-divider"
							dockerLayers={dockerImage?.layers || []}
							treeViewData={treeViewData}
							onSelectLayer={handleSelectLayer}
							onSelectNode={handleSelectTreeNode}
							onSelectFile={handleSelectFile}
							selectedLayerId={selectedLayerId}
							selectedNodeId={selectedTreeNodeId}
							darkMode={appSettings.darkMode}
						/>

						{/* Main Content Area - Second Column */}
						<div className="flex-1 flex flex-col overflow-hidden border-none no-divider">
							{selectedLayer && (
								<LayerInspector 
									layer={selectedLayer} 
									nextLayer={nextLayer} 
									darkMode={appSettings.darkMode}
									selectedFile={_selectedFile}
								/>
							)}
							
							{/* Show Dockerfile editor when no layer is selected */}
							{!selectedLayer && (
								<DockerfileEditor
									content={dockerfileContent}
									onChange={handleDockerfileChange}
									onAnalyze={handleAnalyzeDockerfile}
									analysis={analysis}
								/>
							)}
						</div>
					</div>
				)}
				{/* Status Bar */}
				<div
					className={`px-4 py-2 flex justify-between items-center text-xs ${appSettings.darkMode ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-100 border-t border-gray-200 text-gray-500"}`}
				>
					<div className="flex items-center gap-4">
						<div>Layers v0.1.0</div>
						<button 
							type="button"
							className={`px-2 py-1 rounded text-xs ${appSettings.darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"}`}
							onClick={() => handleSettingsChange({...appSettings, darkMode: !appSettings.darkMode})}
						>
							{appSettings.darkMode ? "Light Mode" : "Dark Mode"}
						</button>
					</div>
					<div>
						{dockerImage
							? `Image: ${dockerImage.name} (${dockerImage.size})`
							: "No image loaded"}
					</div>
				</div>
			</div>
		</SidebarProvider>
	);
}

export default App;
