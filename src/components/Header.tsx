import React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

type HeaderProps = {
	onSelectDockerImage: (imageName: string) => void;
	onUploadDockerfile: (fileContent: string) => void;
	currentImageName: string;
	onSettingsClick?: () => void;
	isLoading?: boolean;
};

const Header: React.FC<HeaderProps> = () => {
	return (
		<div className="flex mx-auto items-center justify-between px-4 py-3 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
			<div className="flex items-center">
				<h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
					Layers
				</h1>
				<div className="ml-2 text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full">
					beta
				</div>
			</div>
		</div>
	);
};

export default Header;
