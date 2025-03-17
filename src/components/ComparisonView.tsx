import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
	Loader2,
	Copy,
	FileIcon,
	FolderIcon,
	PlusIcon,
	MinusIcon,
	PencilIcon,
} from "lucide-react";
import { toast } from "sonner";
import useLayersStore from "@/store/useLayersStore";

export function ComparisonView() {
	const {
		comparisonResult,
		isComparing,
		selectedLayersForComparison,
		dockerImage,
	} = useLayersStore();

	const [activeTab, setActiveTab] = useState<
		"added" | "removed" | "modified" | "unchanged"
	>("added");

	// Get layer names for the comparison
	const getLayerName = (layerId: string) => {
		if (!dockerImage?.layers) return layerId;

		const layerNumber = layerId.replace("layer_", "");
		const index = dockerImage.layers.length - Number.parseInt(layerNumber, 10);

		if (index >= 0 && index < dockerImage.layers.length) {
			const layer = dockerImage.layers[index];
			const command = layer.command || "Base Layer";
			return `Layer ${layerNumber}: ${command.substring(0, 30)}${command.length > 30 ? "..." : ""}`;
		}

		return layerId;
	};

	const copyToClipboard = (content: string) => {
		navigator.clipboard.writeText(content);
		toast.success("Copied to clipboard");
	};

	const renderFileList = (
		files: string[],
		type: "added" | "removed" | "modified" | "unchanged",
	) => {
		if (!files.length) {
			return (
				<div className="py-8 text-center text-muted-foreground">
					No {type} files found
				</div>
			);
		}

		const getIcon = (path: string) => {
			if (path.endsWith("/"))
				return <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" />;
			return <FileIcon className="h-4 w-4 mr-2 flex-shrink-0" />;
		};

		const getTypeIcon = () => {
			switch (type) {
				case "added":
					return <PlusIcon className="h-4 w-4 text-green-500" />;
				case "removed":
					return <MinusIcon className="h-4 w-4 text-red-500" />;
				case "modified":
					return <PencilIcon className="h-4 w-4 text-amber-500" />;
				default:
					return null;
			}
		};

		return (
			<ScrollArea className="h-[calc(100vh-300px)]">
				<div className="space-y-1 p-1">
					{files.map((file) => (
						<div
							key={file}
							className="flex items-center p-2 rounded-md hover:bg-muted group"
						>
							{getTypeIcon()}
							{getIcon(file)}
							<span className="flex-1 truncate text-sm">{file}</span>
						</div>
					))}
				</div>
			</ScrollArea>
		);
	};

	if (isComparing) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="flex flex-col items-center text-center p-8">
					<Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
					<h3 className="text-lg font-medium">Comparing layers...</h3>
					<p className="text-sm text-muted-foreground mt-2">
						This may take a moment depending on the size of the layers
					</p>
				</div>
			</div>
		);
	}

	if (!comparisonResult) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="flex flex-col items-center text-center p-8 max-w-md">
					<h3 className="text-lg font-medium mb-2">
						No comparison results yet
					</h3>
					<p className="text-sm text-muted-foreground">
						Select two layers from the sidebar and click "Compare" to see the
						differences between them.
					</p>
				</div>
			</div>
		);
	}

	const { added, removed, modified, unchanged } = comparisonResult;
	const layer1 = selectedLayersForComparison[0]
		? getLayerName(selectedLayersForComparison[0])
		: "Layer 1";
	const layer2 = selectedLayersForComparison[1]
		? getLayerName(selectedLayersForComparison[1])
		: "Layer 2";

	return (
		<div className="h-full flex flex-col p-4">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-xl font-bold">Layer Comparison</h2>
					<div className="text-sm text-muted-foreground mt-1">
						Comparing {layer1} with {layer2}
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						const summary = `Comparison between ${layer1} and ${layer2}:
- Added: ${added.length} files
- Removed: ${removed.length} files
- Modified: ${modified.length} files
- Unchanged: ${unchanged.length} files`;
						copyToClipboard(summary);
					}}
				>
					<Copy className="h-4 w-4 mr-2" />
					Copy Summary
				</Button>
			</div>

			<div className="grid grid-cols-4 gap-4 mb-4">
				<Card className="col-span-1">
					<CardHeader className="py-4">
						<CardTitle className="text-green-500 flex items-center">
							<PlusIcon className="h-4 w-4 mr-2" />
							Added
						</CardTitle>
						<CardDescription>Files added in {layer2}</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<Badge variant="outline">{added.length} files</Badge>
					</CardContent>
				</Card>

				<Card className="col-span-1">
					<CardHeader className="py-4">
						<CardTitle className="text-red-500 flex items-center">
							<MinusIcon className="h-4 w-4 mr-2" />
							Removed
						</CardTitle>
						<CardDescription>Files removed from {layer1}</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<Badge variant="outline">{removed.length} files</Badge>
					</CardContent>
				</Card>

				<Card className="col-span-1">
					<CardHeader className="py-4">
						<CardTitle className="text-amber-500 flex items-center">
							<PencilIcon className="h-4 w-4 mr-2" />
							Modified
						</CardTitle>
						<CardDescription>Files changed between layers</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<Badge variant="outline">{modified.length} files</Badge>
					</CardContent>
				</Card>

				<Card className="col-span-1">
					<CardHeader className="py-4">
						<CardTitle className="text-muted-foreground flex items-center">
							Unchanged
						</CardTitle>
						<CardDescription>Files identical in both layers</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<Badge variant="outline">{unchanged.length} files</Badge>
					</CardContent>
				</Card>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v: string) =>
					setActiveTab(v as "added" | "removed" | "modified" | "unchanged")
				}
				className="flex-1"
			>
				<TabsList className="grid grid-cols-4 mb-4">
					<TabsTrigger value="added" className="flex items-center">
						<PlusIcon className="h-4 w-4 mr-2 text-green-500" />
						Added ({added.length})
					</TabsTrigger>
					<TabsTrigger value="removed" className="flex items-center">
						<MinusIcon className="h-4 w-4 mr-2 text-red-500" />
						Removed ({removed.length})
					</TabsTrigger>
					<TabsTrigger value="modified" className="flex items-center">
						<PencilIcon className="h-4 w-4 mr-2 text-amber-500" />
						Modified ({modified.length})
					</TabsTrigger>
					<TabsTrigger value="unchanged">
						Unchanged ({unchanged.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="added" className="flex-1 mt-0">
					{renderFileList(added, "added")}
				</TabsContent>

				<TabsContent value="removed" className="flex-1 mt-0">
					{renderFileList(removed, "removed")}
				</TabsContent>

				<TabsContent value="modified" className="flex-1 mt-0">
					{renderFileList(modified, "modified")}
				</TabsContent>

				<TabsContent value="unchanged" className="flex-1 mt-0">
					{renderFileList(unchanged, "unchanged")}
				</TabsContent>
			</Tabs>
		</div>
	);
}
