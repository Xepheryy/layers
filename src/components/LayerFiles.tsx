import * as React from "react";
import {
	File,
	Folder,
	FileText,
	Loader2,
	Copy,
	Check,
	ChevronRight,
	ChevronDown,
	Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useLayersStore from "@/store/useLayersStore";
import type { FileItem } from "../utils/types";
import { useEffect, useState, useMemo } from "react";
import { useWindowSize } from "../hooks/useWindowSize";
import { FixedSizeList as List } from "react-window";
import FileViewer from "./FileViewer";

interface LayerFilesProps {
	className?: string;
}

// Tree node structure for file system representation
interface TreeNode {
	id: string;
	name: string;
	path: string;
	type: string;
	size?: string;
	children: TreeNode[];
	isExpanded?: boolean;
	file: FileItem;
}

export function LayerFiles({ className }: LayerFilesProps) {
	const {
		selectedLayerId,
		selectedLayerNumber,
		selectedLayerFiles,
		isLoadingLayerFiles,
		getLayerFiles,
		selectedFile,
		setSelectedFile,
		loadFileContent,
		isLoadingFileContent,
		taskStatus,
		extractDirectory,
		loadingDirectories,
	} = useLayersStore();

	const [fileTree, setFileTree] = React.useState<TreeNode[]>([]);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set(),
	);
	const windowSize = useWindowSize();
	const [listHeight, setListHeight] = useState(500);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredFileTree, setFilteredFileTree] = useState<TreeNode[]>([]);

	// Determine if we're in a loading state
	const isLoading =
		isLoadingLayerFiles || (taskStatus && !taskStatus.isComplete);

	// Refresh files when the component mounts or when the selected layer changes
	React.useEffect(() => {
		if (selectedLayerId) {
			console.log("Fetching files for layer ID:", selectedLayerId);
			getLayerFiles("current_layer"); // Always use the generic layer name
			setSelectedFile(null); // Reset selected file when layer changes
		}
	}, [selectedLayerId, getLayerFiles, setSelectedFile]);

	// Build file tree when files change
	React.useEffect(() => {
		if (selectedLayerFiles.length > 0) {
			const tree = buildFileTree(selectedLayerFiles);
			setFileTree(tree);
			setFilteredFileTree(tree);
		}
	}, [selectedLayerFiles]);

	// Filter file tree when search query changes
	React.useEffect(() => {
		if (searchQuery.trim() === "") {
			setFilteredFileTree(fileTree);
			return;
		}

		const query = searchQuery.toLowerCase();

		// Helper function to search nodes recursively
		const searchNodes = (nodes: TreeNode[]): TreeNode[] => {
			const results: TreeNode[] = [];

			for (const node of nodes) {
				const nameMatch = node.name.toLowerCase().includes(query);
				const pathMatch = node.path.toLowerCase().includes(query);

				if (nameMatch || pathMatch) {
					// If this node matches, include it
					results.push(node);
				} else if (node.children.length > 0) {
					// If any children match, include this node with filtered children
					const matchingChildren = searchNodes(node.children);
					if (matchingChildren.length > 0) {
						results.push({
							...node,
							children: matchingChildren,
							isExpanded: true,
						});
					}
				}
			}

			return results;
		};

		const filtered = searchNodes(fileTree);
		setFilteredFileTree(filtered);

		// Auto-expand all folders in search results
		const expandedPaths = new Set(expandedFolders);
		const collectPaths = (nodes: TreeNode[]) => {
			for (const node of nodes) {
				if (node.type === "directory" && node.children.length > 0) {
					expandedPaths.add(node.path);
					collectPaths(node.children);
				}
			}
		};

		collectPaths(filtered);
		setExpandedFolders(expandedPaths);
	}, [searchQuery, fileTree, expandedFolders]);

	// Handle file selection
	const handleFileSelect = React.useCallback(
		(file: FileItem) => {
			setSelectedFile(file);
			loadFileContent(file);
		},
		[setSelectedFile, loadFileContent],
	);

	const toggleFolder = (folder: FileItem, event: React.MouseEvent) => {
		event.stopPropagation();
		const path = folder.path;

		// Check if this folder needs to be loaded
		if (
			folder.needs_loading &&
			!expandedFolders.has(path) &&
			!loadingDirectories.has(path)
		) {
			// Extract the directory before expanding it
			extractDirectory(path);
		}

		const newExpandedFolders = new Set(expandedFolders);
		if (expandedFolders.has(path)) {
			newExpandedFolders.delete(path);
		} else {
			newExpandedFolders.add(path);
		}
		setExpandedFolders(newExpandedFolders);
	};

	if (!selectedLayerId) {
		return (
			<div className={cn("h-full flex items-center justify-center", className)}>
				<div className="text-gray-500">No layer selected</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className={cn("h-full flex items-center justify-center", className)}>
				<div className="flex flex-col items-center text-gray-500">
					<Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
					<div>
						{taskStatus ? taskStatus.message : "Loading layer files..."}
						{taskStatus && taskStatus.progress > 0 && (
							<div className="w-48 h-2 bg-gray-200 rounded-full mt-2">
								<div
									className="h-full bg-blue-500 rounded-full"
									style={{ width: `${taskStatus.progress * 100}%` }}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (selectedLayerFiles.length === 0) {
		return (
			<div className={cn("h-full flex items-center justify-center", className)}>
				<div className="text-gray-500">No files available for this layer</div>
			</div>
		);
	}

	return (
		<div className={cn("h-full relative", className)}>
			{/* Frosted glass header */}
			<div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
				<h3 className="text-lg font-semibold flex items-center">
					Filesystem at Layer
					{selectedLayerNumber && (
						<span className="ml-2 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
							{selectedLayerNumber}
						</span>
					)}
					<span className="text-sm font-normal text-muted-foreground ml-2 truncate">
						{selectedLayerId}
					</span>
				</h3>

				{/* Search input */}
				<div className="relative mt-3">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<Search className="h-4 w-4 text-gray-400" />
					</div>
					<input
						type="text"
						className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
						placeholder="Search files and directories..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					{searchQuery && (
						<button
							type="button"
							className="absolute inset-y-0 right-0 flex items-center pr-3"
							onClick={() => setSearchQuery("")}
							aria-label="Clear search"
						>
							<span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
								×
							</span>
						</button>
					)}
				</div>
			</div>

			{/* Scrollable content area */}
			<div className="overflow-auto h-[calc(100%-7rem)] p-4">
				<div className="space-y-1 font-mono text-sm">
					{filteredFileTree.map((node) => (
						<FileTreeNode
							key={node.id}
							node={node}
							level={0}
							onFileSelect={handleFileSelect}
							selectedFilePath={selectedFile?.path}
							disabled={Boolean(isLoading)}
						/>
					))}
				</div>

				{filteredFileTree.length === 0 && searchQuery && (
					<div className="flex flex-col items-center justify-center py-8 text-gray-500">
						<p>No files match your search</p>
						<button
							type="button"
							className="mt-2 text-blue-500 hover:underline"
							onClick={() => setSearchQuery("")}
						>
							Clear search
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function FileTreeNode({
	node,
	level,
	onFileSelect,
	selectedFilePath,
	disabled = false,
}: {
	node: TreeNode;
	level: number;
	onFileSelect: (file: FileItem) => void;
	selectedFilePath?: string;
	disabled?: boolean;
}) {
	const [expanded, setExpanded] = React.useState(node.isExpanded || false);
	const [copied, setCopied] = React.useState(false);
	const isDirectory = node.type === "directory" || node.children.length > 0;
	const isSelected = node.path === selectedFilePath;

	const toggleExpand = (e: React.MouseEvent | React.KeyboardEvent) => {
		if (disabled) return;
		e.stopPropagation();
		setExpanded(!expanded);
	};

	const copyPath = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.stopPropagation();
		// Extract the absolute path without considering workdir
		// Remove the /tmp/layers/[layer_id] prefix if it exists
		let absolutePath = node.path;
		const pathParts = node.path.split("/");
		if (pathParts.length > 3 && pathParts[1] === "layers") {
			// This is a path like /tmp/layers/[layer_id]/path/to/file
			// We want to extract /path/to/file
			absolutePath = `/${pathParts.slice(3).join("/")}`;
		}

		navigator.clipboard
			.writeText(absolutePath)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch((err) => console.error("Failed to copy path:", err));
	};

	const handleClick = (e: React.MouseEvent) => {
		if (disabled) return;
		if (isDirectory) {
			toggleExpand(e);
		} else {
			onFileSelect(node.file);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (disabled) return;
		if (e.key === "Enter" || e.key === " ") {
			if (isDirectory) {
				toggleExpand(e);
			} else {
				onFileSelect(node.file);
			}
		}
	};

	return (
		<>
			<div
				className={cn(
					"flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer group",
					expanded && isDirectory && "bg-gray-50 dark:bg-gray-800/50",
					isSelected &&
						"bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
					disabled && "opacity-50 cursor-not-allowed",
				)}
				style={{ paddingLeft: `${level * 16 + 8}px` }}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				tabIndex={disabled ? -1 : 0}
				role={isDirectory ? "button" : "button"}
				aria-expanded={isDirectory ? expanded : undefined}
				aria-disabled={disabled}
			>
				<div className="flex-shrink-0 mr-2">
					{isDirectory ? (
						<div className="flex items-center">
							{expanded ? (
								<ChevronDown className="h-4 w-4 text-gray-500" />
							) : (
								<ChevronRight className="h-4 w-4 text-gray-500" />
							)}
							<Folder className="h-4 w-4 text-blue-500 ml-1" />
						</div>
					) : node.name.endsWith(".txt") ? (
						<FileText className="h-4 w-4 text-amber-500" />
					) : (
						<File className="h-4 w-4 text-gray-500" />
					)}
				</div>

				<div className="flex-1 truncate">{node.name}</div>

				{node.size && (
					<div className="text-xs text-gray-500 mr-2">{node.size}</div>
				)}

				<div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
					{copied ? (
						<Check className="h-4 w-4 text-green-500" />
					) : (
						<Copy
							className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							onClick={(e) => {
								e.stopPropagation();
								copyPath(e);
							}}
						/>
					)}
				</div>
			</div>

			{expanded && isDirectory && node.children.length > 0 && (
				<div>
					{node.children.map((child) => (
						<FileTreeNode
							key={child.id}
							node={child}
							level={level + 1}
							onFileSelect={onFileSelect}
							selectedFilePath={selectedFilePath}
							disabled={disabled}
						/>
					))}
				</div>
			)}
		</>
	);
}

// Helper function to build a file tree from flat file list
function buildFileTree(files: FileItem[]): TreeNode[] {
	const root: TreeNode[] = [];
	const nodeMap: Record<string, TreeNode> = {};

	// First pass: create all nodes
	for (const file of files) {
		const pathParts = file.path.split("/").filter(Boolean);
		let relativePath: string[] = [];

		// Handle paths with /tmp/layers/[layer_id] prefix
		if (
			pathParts.length > 3 &&
			pathParts[0] === "tmp" &&
			pathParts[1] === "layers"
		) {
			// Skip the /tmp/layers/current_layer/fs part
			relativePath = pathParts.slice(4);
		} else {
			relativePath = pathParts;
		}

		// Skip special files at the root level
		if (
			relativePath.length === 0 ||
			(relativePath.length === 1 &&
				(relativePath[0] === "layer_info.txt" ||
					relativePath[0] === "command.txt" ||
					relativePath[0] === "fs.tar"))
		) {
			continue;
		}

		// Create nodes for each part of the path
		let currentPath = "";
		let parentPath = "";

		for (let i = 0; i < relativePath.length; i++) {
			const part = relativePath[i];
			parentPath = currentPath;
			currentPath = currentPath ? `${currentPath}/${part}` : part;

			// Skip if node already exists
			if (nodeMap[currentPath]) continue;

			const isLeaf = i === relativePath.length - 1;
			const node: TreeNode = {
				id: currentPath,
				name: part,
				path: file.path, // Keep the original full path
				type: isLeaf ? "file" : "directory",
				size: isLeaf ? file.size?.toString() : undefined,
				children: [],
				isExpanded: false,
				file: isLeaf
					? file
					: {
							...file,
							name: part,
							path: file.path,
							is_dir: true,
						},
			};

			nodeMap[currentPath] = node;

			// Add to parent or root
			if (parentPath) {
				if (nodeMap[parentPath]) {
					nodeMap[parentPath].children.push(node);
				}
			} else {
				root.push(node);
			}
		}
	}

	// Sort children: directories first, then alphabetically
	const sortNodes = (nodes: TreeNode[]) => {
		nodes.sort((a, b) => {
			// Directories first
			if (a.type === "directory" && b.type !== "directory") return -1;
			if (a.type !== "directory" && b.type === "directory") return 1;
			// Then alphabetically
			return a.name.localeCompare(b.name);
		});

		// Sort children recursively
		for (const node of nodes) {
			if (node.children.length > 0) {
				sortNodes(node.children);
			}
		}
	};

	sortNodes(root);
	return root;
}
