import * as React from "react";
import { ChevronRight, File, Folder, LayersIcon } from "lucide-react";

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
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";

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
	// Set up theme for dark/light mode (will work with shadcn's theming)
	React.useEffect(() => {
		if (darkMode) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [darkMode]);

	// Convert DockerLayer[] to the format expected by the sidebar
	const formattedLayers = dockerLayers.map((layer) => ({
		...layer,
		isSelected: layer.id === selectedLayerId,
	}));

	return (
		<Sidebar
			variant="sidebar"
			collapsible="icon"
			className={cn("border-none relative")}
			{...props}
		>
			<div className="absolute right-0 top-0 bottom-0 w-[1px] bg-border" />
			<SidebarHeader className="flex items-start px-4 py-2">
				<h2 className="flex-1 text-lg font-medium">Layers</h2>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Layers</SidebarGroupLabel>
					<SidebarGroupContent>
						{formattedLayers.length > 0 ? (
							<SidebarMenu>
								{formattedLayers.map((layer) => (
									<SidebarMenuItem key={layer.id}>
										<SidebarMenuButton
											onClick={() => onSelectLayer(layer.id)}
											isActive={layer.isSelected}
										>
											<LayersIcon className="h-4 w-4 shrink-0" />
											<span className="flex-1 truncate">{layer.name}</span>
										</SidebarMenuButton>
										{layer.isSelected && (
											<div className="pl-6 py-1 text-xs text-muted-foreground space-y-1">
												<p className="truncate">{layer.command}</p>
												<SidebarMenuBadge>{layer.size}</SidebarMenuBadge>
											</div>
										)}
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						) : (
							<div className="px-4 py-3 text-sm text-muted-foreground">
								Load a Dockerfile to populate layers
							</div>
						)}
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Files section */}
				<SidebarGroup>
					<SidebarGroupLabel>Files</SidebarGroupLabel>
					<SidebarGroupContent>
						{treeViewData.length > 0 ? (
							<SidebarMenu>
								{treeViewData.map((node) => (
									<FileTree
										key={node.id}
										node={node}
										onSelectNode={onSelectNode}
										selectedNodeId={selectedNodeId}
									/>
								))}
							</SidebarMenu>
						) : (
							<div className="px-4 py-3 text-sm text-muted-foreground">
								No files available
							</div>
						)}
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

function FileTree({
	node,
	onSelectNode,
	selectedNodeId,
}: {
	node: TreeNode;
	onSelectNode: (node: TreeNode) => void;
	selectedNodeId: string | null;
}) {
	if (node.type === "file") {
		return (
			<SidebarMenuButton
				isActive={node.id === selectedNodeId}
				onClick={() => onSelectNode(node)}
				className="data-[active=true]:bg-accent"
			>
				<File className="h-4 w-4" />
				<span className="ml-2">{node.name}</span>
			</SidebarMenuButton>
		);
	}

	return (
		<SidebarMenuItem>
			<Collapsible
				className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
				defaultOpen={
					node.id === selectedNodeId ||
					node.children?.some((child) => child.id === selectedNodeId)
				}
			>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton>
						<ChevronRight className="h-4 w-4 transition-transform" />
						<Folder className="h-4 w-4" />
						<span className="ml-2">{node.name}</span>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{node.children?.map((childNode) => (
							<FileTree
								key={childNode.id}
								node={childNode}
								onSelectNode={onSelectNode}
								selectedNodeId={selectedNodeId}
							/>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	);
}
