import { type FC } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Sun, FolderOpen, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import useLayersStore from "@/store/useLayersStore";

type HeaderProps = {
	onSelectDockerImage: (imageName: string) => void;
	onUploadDockerfile: (fileContent: string) => void;
	currentImageName: string;
	darkMode: boolean;
	onToggleDarkMode: () => void;
};

const Header: FC<HeaderProps> = ({
	onSelectDockerImage,
	onUploadDockerfile,
	currentImageName,
	darkMode,
	onToggleDarkMode,
}) => {
	const { setIsLoading, setError } = useLayersStore();

	const handleOpenDockerfile = async () => {
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: "Dockerfile",
						extensions: ["dockerfile", "Dockerfile", "*"],
					},
				],
			});

			if (selected && !Array.isArray(selected)) {
				const content = await readTextFile(selected);
				onUploadDockerfile(content);
			}
		} catch (error) {
			console.error("Error opening Dockerfile:", error);
		}
	};

	const handleCleanupImages = async () => {
		try {
			setIsLoading(true);
			await invoke<string>("cleanup_layers_images");
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			setError(`Failed to clean up images: ${error}`);
			console.error("Error cleaning up images:", error);
		}
	};

	return (
		<div
			className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? "bg-background border-border" : "bg-background border-border"}`}
		>
			<div className="flex items-center">
				<h1 className="text-xl font-semibold">Layers</h1>
				<div className="ml-2 text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full">
					beta
				</div>
			</div>

			<div className="flex items-center space-x-4">
				<Input
					placeholder="Enter image name..."
					className="w-64"
					value={currentImageName}
					onChange={(e) => onSelectDockerImage(e.target.value)}
				/>

				<Button variant="outline" onClick={handleOpenDockerfile}>
					<FolderOpen className="mr-2 h-4 w-4" />
					Open Dockerfile
				</Button>

				<Button
					variant="outline"
					onClick={handleCleanupImages}
					title="Clean up Docker images tagged with 'layers'"
				>
					<Trash2 className="mr-2 h-4 w-4" />
					Cleanup
				</Button>

				<Button
					variant="ghost"
					size="icon"
					onClick={onToggleDarkMode}
					aria-label="Toggle theme"
				>
					{darkMode ? (
						<Sun className="h-5 w-5" />
					) : (
						<Moon className="h-5 w-5" />
					)}
				</Button>
			</div>
		</div>
	);
};

export default Header;
