import * as React from "react";
import { ChevronRight, File, Folder, LayersIcon } from "lucide-react";

import type { TreeNode } from "./TreeView";
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
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type DockerLayer = {
  id: string;
  name: string;
  command: string;
  size: string;
  isSelected: boolean;
};

interface DockerLayersSidebarProps {
  layers: DockerLayer[];
  treeViewData: TreeNode[];
  onSelectLayer: (id: string) => void;
  onSelectNode: (node: TreeNode) => void;
  selectedNodeId: string | null;
  darkMode: boolean;
}

export function DockerLayersSidebar({
  layers,
  treeViewData,
  onSelectLayer,
  onSelectNode,
  selectedNodeId,
  darkMode,
}: DockerLayersSidebarProps) {
  // Set up theme for dark/light mode (will work with shadcn's theming)
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        variant="sidebar" 
        collapsible="icon"
        className={cn("border-r border-border")}
      >
        <SidebarHeader className="flex items-center px-4 py-2">
          <h2 className="flex-1 text-lg font-semibold">Explorer</h2>
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarContent>
          {/* Recent section - similar to Changes in the screenshot */}
          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {(layers && layers.length > 0) ? (
                  layers.slice(0, 3).map((layer) => (
                    <SidebarMenuItem key={layer.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectLayer(layer.id)}
                        isActive={layer.isSelected}
                      >
                        <LayersIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{layer.name}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>{layer.size}</SidebarMenuBadge>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No recent layers
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Layers section - renamed from Files in the screenshot */}
          <SidebarGroup>
            <SidebarGroupLabel>Layers</SidebarGroupLabel>
            <SidebarGroupContent>
              {(layers && layers.length > 0) ? (
                <SidebarMenu>
                  {layers.map((layer) => (
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
              {(treeViewData && treeViewData.length > 0) ? (
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
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}

function FileTree({ 
  node, 
  onSelectNode, 
  selectedNodeId 
}: { 
  node: TreeNode; 
  onSelectNode: (node: TreeNode) => void; 
  selectedNodeId: string | null;
}) {
  if (node.type === 'file') {
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
        defaultOpen={node.id === selectedNodeId || node.children?.some(child => child.id === selectedNodeId)}
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

export default DockerLayersSidebar;
