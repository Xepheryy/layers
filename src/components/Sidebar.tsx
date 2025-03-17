import * as React from "react";
import {
	LayersIcon,
	RefreshCw,
	Box,
	ChevronDown,
	DiffIcon,
} from "lucide-react";

import type { TreeNode } from "./TreeView";
import type { DockerLayer, FileItem } from "../utils/types";
// Using cn for conditional className styling
import { cn } from "@/lib/utils";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import useLayersStore from "@/store/useLayersStore";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

interface AppSidebarProps {
	dockerLayers?: DockerLayer[];
	treeViewData?: TreeNode[];
	onSelectLayer?: (id: string) => void;
	onSelectNode?: (node: TreeNode) => void;
	onSelectFile?: (file: FileItem) => void;
	selectedLayerId?: string | null;
	selectedNodeId?: string | null;
	darkMode?: boolean;
}

export function AppSidebar({
	dockerLayers = [],
	treeViewData = [],
	onSelectLayer = () => {},
	onSelectNode = () => {},
	onSelectFile = () => {},
	selectedLayerId = null,
	selectedNodeId = null,
	darkMode = false,
	...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
	const {
		setDockerfileContent,
		setSelectedLayerId,
		setAnalysis,
		availableImages,
		isLoadingImages,
		selectedImageId,
		fetchAvailableImages,
		selectImageAndProcessLayers,
		exportSingleLayer,
		// Comparison state and actions
		isComparisonMode,
		toggleComparisonMode,
		selectedLayersForComparison,
		addLayerForComparison,
		removeLayerForComparison,
		clearLayersForComparison,
		isComparing,
		compareLayers,
	} = useLayersStore();

	// Set up theme for dark/light mode (will work with shadcn's theming)
	React.useEffect(() => {
		if (darkMode) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [darkMode]);

	const handleOpenDockerfile = async () => {
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: "Dockerfile",
						extensions: ["dockerfile", "*"],
					},
				],
			});

			if (selected) {
				const content = await readTextFile(selected as string);
				setDockerfileContent(content);
			}
		} catch (error) {
			console.error("Error opening Dockerfile:", error);
		}
	};

	const handleSelectImage = (imageId: string) => {
		// Process the selected image
		selectImageAndProcessLayers(imageId);
	};

	const handleSelectLayer = (layerId: string) => {
		if (isComparisonMode) {
			// In compare mode, toggle layer selection
			if (selectedLayersForComparison.includes(layerId)) {
				removeLayerForComparison(layerId);
			} else {
				addLayerForComparison(layerId);
			}
		} else {
			// Normal mode - select a single layer
			console.log("Selecting layer with ID:", layerId);
			console.log("Layer ID type:", typeof layerId);
			console.log("Layer ID length:", layerId.length);

			// Set the selected layer ID first
			setSelectedLayerId(layerId);
			onSelectLayer(layerId);

			// Then export the selected layer to get its files
			exportSingleLayer(layerId);
		}
	};

	const handleCompareLayers = async () => {
		if (selectedLayersForComparison.length !== 2) {
			toast.error("Please select exactly 2 layers to compare");
			return;
		}

		try {
			const result = await compareLayers();

			if (result) {
				// Format the comparison summary
				const summaryText = `Comparison results:
- Added: ${result.added.length} files
- Removed: ${result.removed.length} files
- Modified: ${result.modified.length} files
- Unchanged: ${result.unchanged.length} files`;

				// Show a toast with the summary and copy button
				toast.success(
					`Comparison complete: ${result.added.length} added, ${result.removed.length} removed, ${result.modified.length} modified files`,
					{
						description: `${result.unchanged.length} files unchanged`,
						action: {
							label: "Copy Results",
							onClick: () => {
								navigator.clipboard.writeText(summaryText);
								toast.info("Comparison results copied to clipboard");
							},
						},
					},
				);
			}
		} catch (error) {
			console.error("Error comparing layers:", error);
			const errorMessage = `Failed to compare layers: ${error}`;
			toast.error("Layer comparison failed", {
				description:
					String(error).substring(0, 100) +
					(String(error).length > 100 ? "..." : ""),
				action: {
					label: "Copy Error",
					onClick: () => {
						navigator.clipboard.writeText(errorMessage);
						toast.info("Error details copied to clipboard");
					},
				},
			});
		}
	};

	return (
		<Sidebar
			className={cn(
				"h-full border-r border-gray-200 dark:border-gray-700 flex flex-col",
				darkMode ? "dark" : "",
			)}
			{...props}
		>
			<SidebarHeader className="h-14 flex items-center px-4 border-b flex-shrink-0">
				<span className="text-lg font-semibold">Layers Explorer</span>
			</SidebarHeader>

			<div className="flex flex-col flex-1 overflow-hidden">
				{/* Docker Images Section */}
				<SidebarContent className="flex-none overflow-auto sidebar-section">
					<SidebarGroup>
						<Collapsible defaultOpen className="w-full">
							<div className="flex items-center justify-between px-3 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
								<div className="flex items-center">
									<Box className="h-5 w-5 mr-2 text-primary" />
									<SidebarGroupLabel className="font-semibold">
										Docker Images
									</SidebarGroupLabel>
								</div>
								<div className="flex items-center">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 mr-1 hover:bg-gray-200 dark:hover:bg-gray-700"
										onClick={fetchAvailableImages}
										disabled={isLoadingImages}
										title="Refresh Images"
									>
										<RefreshCw
											className={cn(
												"h-4 w-4",
												isLoadingImages && "animate-spin",
											)}
										/>
									</Button>
									<CollapsibleTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 hover:bg-gray-200 dark:hover:bg-gray-700"
										>
											<ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
										</Button>
									</CollapsibleTrigger>
								</div>
							</div>
							<CollapsibleContent>
								<SidebarGroupContent className="p-2">
									{isLoadingImages ? (
										<div className="px-3 py-2 text-sm text-muted-foreground flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-md">
											<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
											Loading images...
										</div>
									) : availableImages.filter(
											(img) =>
												!(img.repository === "<none>" && img.tag === "<none>"),
										).length > 0 ? (
										<SidebarMenu className="max-h-48 overflow-y-auto space-y-1">
											{availableImages
												.filter(
													(img) =>
														!(
															img.repository === "<none>" &&
															img.tag === "<none>"
														),
												)
												.map((image) => (
													<SidebarMenuItem
														key={image.id}
														data-active={image.id === selectedImageId}
														onClick={() => handleSelectImage(image.id)}
														className="data-[active=true]:bg-accent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors py-2 px-3 rounded-md my-1 cursor-pointer"
													>
														<Box className="h-4 w-4 mr-2 flex-shrink-0" />
														<div className="flex flex-col flex-1 min-w-0">
															<div className="flex items-center">
																<span className="font-medium truncate">
																	{image.repository}
																</span>
																<span className="text-xs text-muted-foreground ml-1">
																	:{image.tag}
																</span>
															</div>
															<div className="flex justify-between items-center mt-1">
																<span className="text-xs text-muted-foreground">
																	{image.created}
																</span>
																<SidebarMenuBadge className="ml-auto text-xs">
																	{image.size}
																</SidebarMenuBadge>
															</div>
														</div>
													</SidebarMenuItem>
												))}
										</SidebarMenu>
									) : (
										<div className="px-3 py-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-md text-center">
											No Docker images available
										</div>
									)}
								</SidebarGroupContent>
							</CollapsibleContent>
						</Collapsible>
					</SidebarGroup>
				</SidebarContent>

				{/* Docker Layers Section */}
				<SidebarContent className="flex-1 overflow-auto border-t border-gray-200 dark:border-gray-700 mt-2 sidebar-section">
					<SidebarGroup>
						<Collapsible defaultOpen className="w-full">
							<div className="flex items-center justify-between px-3 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
								<div className="flex items-center">
									<LayersIcon className="h-5 w-5 mr-2 text-primary" />
									<SidebarGroupLabel className="font-semibold">
										Docker Layers
									</SidebarGroupLabel>
								</div>
								<div className="flex items-center">
									<Button
										variant="ghost"
										size="icon"
										className={cn(
											"h-7 w-7 mr-1 hover:bg-gray-200 dark:hover:bg-gray-700",
											isComparisonMode &&
												"bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300",
										)}
										onClick={toggleComparisonMode}
										title={
											isComparisonMode ? "Exit Compare Mode" : "Compare Layers"
										}
									>
										<DiffIcon className="h-4 w-4" />
									</Button>
									<CollapsibleTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 hover:bg-gray-200 dark:hover:bg-gray-700"
										>
											<ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
										</Button>
									</CollapsibleTrigger>
								</div>
							</div>
							<CollapsibleContent>
								{isComparisonMode && (
									<div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
										<div className="flex justify-between items-center">
											<span className="text-sm text-blue-700 dark:text-blue-300">
												{selectedLayersForComparison.length === 0
													? "Select 2 layers to compare"
													: selectedLayersForComparison.length === 1
														? "Select 1 more layer"
														: "Ready to compare"}
											</span>
											<Button
												size="sm"
												variant="outline"
												className="h-7 text-xs"
												disabled={
													selectedLayersForComparison.length !== 2 ||
													isComparing
												}
												onClick={handleCompareLayers}
											>
												{isComparing ? (
													<>
														<RefreshCw className="h-3 w-3 mr-1 animate-spin" />
														Comparing...
													</>
												) : (
													"Compare"
												)}
											</Button>
										</div>
									</div>
								)}
								<SidebarGroupContent className="p-2">
									{dockerLayers.length > 0 ? (
										<SidebarMenu className="overflow-y-auto space-y-1">
											{[...dockerLayers].reverse().map((layer, index) => {
												// Calculate layer number (from top to bottom, starting with 1)
												const layerNumber = index + 1;
												// Create a layer ID that includes the number
												const numberedLayerId = `layer_${layerNumber}`;

												// Determine if this layer is selected for comparison
												const isSelectedForComparison =
													isComparisonMode &&
													selectedLayersForComparison.includes(numberedLayerId);

												return (
													<SidebarMenuItem
														key={layer.id}
														data-active={
															isComparisonMode
																? isSelectedForComparison
																: layer.id === selectedLayerId ||
																	numberedLayerId === selectedLayerId
														}
														onClick={() => handleSelectLayer(numberedLayerId)}
														className={cn(
															"hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors py-1.5 px-3 rounded-md my-0.5 cursor-pointer",
															isComparisonMode &&
																isSelectedForComparison &&
																"bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800",
															!isComparisonMode &&
																(layer.id === selectedLayerId ||
																	numberedLayerId === selectedLayerId) &&
																"data-[active=true]:bg-accent",
														)}
													>
														<div className="flex flex-col flex-1 min-w-0">
															<div className="flex items-center">
																<span
																	className={cn(
																		"font-medium mr-2 text-xs px-1.5 py-0.5 rounded-full",
																		isSelectedForComparison
																			? "bg-blue-200 dark:bg-blue-800"
																			: "bg-gray-200 dark:bg-gray-700",
																	)}
																>
																	{layerNumber}
																</span>
																<span className="font-medium truncate">
																	{layer.command
																		? layer.command.substring(0, 30) +
																			(layer.command.length > 30 ? "..." : "")
																		: "Base Layer"}
																</span>
															</div>
															<div className="flex justify-end items-center">
																<SidebarMenuBadge className="text-xs">
																	{layer.size}
																</SidebarMenuBadge>
															</div>
														</div>
													</SidebarMenuItem>
												);
											})}
										</SidebarMenu>
									) : (
										<div className="px-3 py-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-md text-center">
											No layers available
										</div>
									)}
								</SidebarGroupContent>
							</CollapsibleContent>
						</Collapsible>
					</SidebarGroup>
				</SidebarContent>
			</div>
		</Sidebar>
	);
}
