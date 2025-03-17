import { useEffect, useCallback, useState } from "react";
import { Loader2, FileIcon, DiffIcon } from "lucide-react";
import type { DockerfileAnalysis } from "./utils/types";
import "./App.css";
import useLayersStore from "./store/useLayersStore";
import type { TreeNode } from "./components/TreeView";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { resolveResource } from "@tauri-apps/api/path";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { LayerFiles } from "./components/LayerFiles";
import FileViewer from "./components/FileViewer";
import { Toaster } from "sonner";
import { ComparisonView } from "./components/ComparisonView";
import { Dock, DockIcon } from "./components/magicui/dock";

// Fallback Dockerfile content in case resource loading fails
const FALLBACK_DOCKERFILE = `# Using Alpine Linux as the base image (~5MB vs ~72MB for Ubuntu)
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
RUN addgroup -g 1000 appgroup && \\
    adduser -S -G appgroup -u 1000 appuser
USER appuser

# Single optimized RUN command for dependencies
RUN apk add --no-cache curl

# COPY command for static content
COPY config.json /config.json

# ADD command for remote content
ADD https://example.com/script.sh /script.sh

# CMD instruction for container startup
CMD ["ash", "-c", "/script.sh"]`;

function App() {
	const {
		dockerImage,
		selectedLayerId,
		setSelectedLayerId,
		dockerfileContent,
		setDockerfileContent,
		isLoading,
		setIsLoading,
		setError,
		analysis,
		setAnalysis,
		darkMode,
		selectedFile,
		selectedFileContent,
		setSelectedFileContent,
		isComparisonMode,
		toggleComparisonMode,
	} = useLayersStore();

	// Load sample Dockerfile on component mount
	const loadSampleDockerfile = useCallback(async () => {
		try {
			setIsLoading(true);
			let content: string;

			try {
				// Try to resolve the path to the Dockerfile.example resource
				const dockerfilePath = await resolveResource(
					"resources/Dockerfile.example",
				);
				console.log("Resolved Dockerfile path:", dockerfilePath);
				content = await readTextFile(dockerfilePath);
				console.log(
					`Loaded Dockerfile content from resource: ${content.substring(0, 100)}...`,
				);
			} catch (resourceError: unknown) {
				console.warn(
					"Failed to load from resource, using fallback:",
					resourceError,
				);
				content = FALLBACK_DOCKERFILE;
				console.log("Using fallback Dockerfile content");
			}

			setDockerfileContent(content);
			setIsLoading(false);
		} catch (error) {
			console.error("Error loading sample Dockerfile:", error);
			setError(
				"Failed to load sample Dockerfile. Please try loading it manually.",
			);
			setIsLoading(false);
		}
	}, [setDockerfileContent, setIsLoading, setError]);

	// Call loadSampleDockerfile immediately on mount, regardless of existing content
	useEffect(() => {
		console.log("App mounted, loading sample Dockerfile");
		loadSampleDockerfile();
	}, [loadSampleDockerfile]);

	// Function to analyze the Dockerfile content
	const handleAnalyzeDockerfile = useCallback(
		(content: string) => {
			// Here you would typically call a backend service to analyze the Dockerfile
			// For now, we'll just set a mock analysis
			console.log("Analyzing Dockerfile:", content);
			// Mock analysis result based on the actual type
			const mockAnalysis: DockerfileAnalysis = {
				layerImpact: [
					{
						lineNumber: 1,
						instruction: "FROM",
						impact: "Base image selection",
					},
				],
				optimizationSuggestions: [
					{
						title: "Use multi-stage builds",
						description:
							"Consider using multi-stage builds to reduce final image size.",
					},
				],
			};
			setAnalysis(mockAnalysis);
		},
		[setAnalysis],
	);

	// Generate tree view data from layers if available
	const treeViewData: TreeNode[] = [];
	if (dockerImage?.layers) {
		// Get files from the selected layer or the last layer if none selected
		const selectedLayer =
			dockerImage.layers.find((layer) => layer.id === selectedLayerId) ||
			(dockerImage.layers.length > 0
				? dockerImage.layers[dockerImage.layers.length - 1]
				: null);

		if (selectedLayer?.files) {
			// Convert files to TreeNode structure
			for (const file of selectedLayer.files) {
				treeViewData.push({
					id: file.path,
					name: file.name,
					type: file.is_dir ? "directory" : "file",
					path: file.path,
					size: typeof file.size === "number" ? `${file.size} bytes` : "",
					children: file.is_dir ? [] : undefined,
				});
			}
		}
	}

	// Debug output to check if content is available
	useEffect(() => {
		console.log(
			"Current Dockerfile content length:",
			dockerfileContent?.length || 0,
		);
	}, [dockerfileContent]);

	return (
		<SidebarProvider>
			<div
				className={`flex w-full flex-col h-screen min-h-[700px] ${darkMode ? "dark" : ""}`}
			>
				<div className="flex-1 flex overflow-hidden">
					<main className="flex-1 flex flex-col overflow-hidden relative">
						<>
							{isComparisonMode ? (
								<ResizablePanelGroup
									direction="horizontal"
									className="w-full h-full min-h-0"
								>
									<ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
										<AppSidebar
											dockerLayers={dockerImage?.layers || []}
											treeViewData={treeViewData}
											onSelectLayer={setSelectedLayerId}
											selectedLayerId={selectedLayerId}
											darkMode={darkMode}
											className="h-full"
										/>
									</ResizablePanel>
									<ResizableHandle withHandle />
									<ResizablePanel defaultSize={80}>
										<ComparisonView />
									</ResizablePanel>
								</ResizablePanelGroup>
							) : (
								<ResizablePanelGroup
									direction="horizontal"
									className="w-full h-full min-h-0"
								>
									<ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
										<AppSidebar
											dockerLayers={dockerImage?.layers || []}
											treeViewData={treeViewData}
											onSelectLayer={setSelectedLayerId}
											selectedLayerId={selectedLayerId}
											darkMode={darkMode}
											className="h-full"
										/>
									</ResizablePanel>
									<ResizableHandle withHandle />
									<ResizablePanel defaultSize={30}>
										<LayerFiles />
									</ResizablePanel>
									<ResizableHandle withHandle />
									<ResizablePanel defaultSize={50}>
										{isLoading ? (
											<div className="h-full flex items-center justify-center">
												<div className="flex flex-col items-center text-gray-500">
													<Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
													<div>Loading Dockerfile...</div>
												</div>
											</div>
										) : selectedFile ? (
											<FileViewer
												file={selectedFile}
												content={selectedFileContent}
												onChange={setSelectedFileContent}
												isReadOnly={false}
											/>
										) : dockerfileContent ? (
											<FileViewer
												content={dockerfileContent}
												onChange={setDockerfileContent}
												onAnalyze={handleAnalyzeDockerfile}
												analysis={analysis}
												fileType="dockerfile"
											/>
										) : (
											<div className="h-full flex items-center justify-center">
												<div className="text-gray-500">No file selected</div>
											</div>
										)}
									</ResizablePanel>
								</ResizablePanelGroup>
							)}

							{/* Floating dock at the bottom */}
							<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
								<Dock
									className="bg-background/80 backdrop-blur-md border-border shadow-lg"
									iconSize={30}
									iconMagnification={40}
									iconDistance={100}
								>
									<DockIcon
										className={`bg-background/80 border border-border ${!isComparisonMode ? "ring-2 ring-primary" : ""}`}
										onClick={() => isComparisonMode && toggleComparisonMode()}
									>
										<FileIcon className="h-4 w-4 text-foreground" />
									</DockIcon>
									<DockIcon
										className={`bg-background/80 border border-border ${isComparisonMode ? "ring-2 ring-primary" : ""}`}
										onClick={() => !isComparisonMode && toggleComparisonMode()}
									>
										<DiffIcon className="h-4 w-4 text-foreground" />
									</DockIcon>
								</Dock>
							</div>
						</>
					</main>
				</div>
				<StatusBar />
			</div>
			<Toaster />
		</SidebarProvider>
	);
}

export default App;
