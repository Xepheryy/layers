import {
	useState,
	useEffect,
	useCallback,
	type FC,
	type ChangeEvent,
	useRef,
} from "react";
import type { DockerfileAnalysis, FileItem } from "../utils/types";
import { Button } from "@/components/ui/button";
import {
	Loader2,
	Save,
	Download,
	Edit,
	Check,
	AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define tooltips for common Dockerfile commands
const DOCKERFILE_TOOLTIPS: Record<string, string> = {
	FROM: "Sets the base image for subsequent instructions.",
	RUN: "Executes commands in a new layer on top of the current image and commits the results.",
	CMD: "Provides default commands for an executing container.",
	LABEL: "Adds metadata to an image.",
	EXPOSE:
		"Informs Docker that the container listens on the specified network ports at runtime.",
	ENV: "Sets the environment variable.",
	ADD: "Copies new files, directories or remote file URLs and adds them to the filesystem of the image.",
	COPY: "Copies new files or directories and adds them to the filesystem of the container.",
	ENTRYPOINT: "Configures a container that will run as an executable.",
	VOLUME:
		"Creates a mount point and marks it as holding externally mounted volumes.",
	USER: "Sets the user name or UID to use when running the image.",
	WORKDIR:
		"Sets the working directory for any RUN, CMD, ENTRYPOINT, COPY and ADD instructions.",
	ARG: "Defines a variable that users can pass at build-time to the builder.",
	ONBUILD:
		"Adds a trigger instruction when the image is used as the base for another build.",
	STOPSIGNAL:
		"Sets the system call signal that will be sent to the container to exit.",
	HEALTHCHECK:
		"Tells Docker how to test a container to check that it is still working.",
	SHELL:
		"Allows the default shell used for the shell form of commands to be overridden.",
};

type FileViewerProps = {
	file?: FileItem;
	content: string;
	onChange?: (content: string) => void;
	onAnalyze?: (content: string) => void;
	analysis?: DockerfileAnalysis | null;
	isReadOnly?: boolean;
	fileType?: string;
};

// CSS classes for syntax highlighting
const editorStyles = {
	editor: "relative font-fira-code bg-transparent h-full",
	textarea:
		"w-full h-full p-3 pt-3 pl-14 font-fira-code text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-md resize-none leading-6",
	lineNumbers:
		"absolute top-0 left-0 bottom-0 w-12 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-l-md pt-3 overflow-hidden",
	commentLine: "text-gray-500",
	instructionLine: "text-blue-600 dark:text-blue-400 font-semibold",
	lineNumber: "h-6 text-xs text-right pr-2 text-gray-400 dark:text-gray-500",
};

// Determine file type based on file name or explicit type
const getFileType = (
	fileName: string | undefined,
	explicitType?: string,
): string => {
	if (explicitType) return explicitType;
	if (!fileName) return "text";

	if (fileName.endsWith("Dockerfile") || fileName === "Dockerfile")
		return "dockerfile";
	if (fileName.endsWith(".json")) return "json";
	if (fileName.endsWith(".md")) return "markdown";
	if (fileName.endsWith(".txt")) return "text";
	if (fileName.endsWith(".sh")) return "shell";
	if (fileName.endsWith(".yml") || fileName.endsWith(".yaml")) return "yaml";

	return "text";
};

// Check if content is an error message from the backend
const isBinaryFileError = (content: string): boolean => {
	const binaryErrorPatterns = [
		"Cannot display binary file",
		"File contains invalid UTF-8",
		"File is too large to display",
	];

	return binaryErrorPatterns.some((pattern) => content.includes(pattern));
};

// Generic file viewer/editor component
const FileViewer: FC<FileViewerProps> = ({
	file,
	content,
	onChange,
	onAnalyze,
	analysis,
	isReadOnly = false,
	fileType: explicitFileType,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const editorRef = useRef<HTMLTextAreaElement>(null);
	const [lineNumbersRef, setLineNumbersRef] = useState<HTMLDivElement | null>(
		null,
	);

	const fileType = getFileType(file?.name, explicitFileType);
	const isBinaryError = isBinaryFileError(content);

	// Load FiraCode font
	useEffect(() => {
		// Add FiraCode font to the document if it doesn't exist
		if (!document.getElementById("fira-code-font")) {
			const link = document.createElement("link");
			link.id = "fira-code-font";
			link.rel = "stylesheet";
			link.href =
				"https://cdn.jsdelivr.net/npm/firacode@6.2.0/distr/fira_code.css";
			document.head.appendChild(link);

			// Add the font-family to the CSS
			const style = document.createElement("style");
			style.textContent = `
				@import url('https://cdn.jsdelivr.net/npm/firacode@6.2.0/distr/fira_code.css');
				.font-fira-code {
					font-family: 'Fira Code', monospace;
					font-feature-settings: 'calt' 1; /* For ligatures */
				}
			`;
			document.head.appendChild(style);
		}
	}, []);

	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		const newContent = e.target.value;
		onChange?.(newContent);
	};

	const handleSave = () => {
		console.log("FileViewer save clicked");
		setIsSaving(true);

		// If this is a Dockerfile, analyze it
		if (fileType === "dockerfile" && onAnalyze) {
			onAnalyze(content);
		}

		// Simulate saving
		setTimeout(() => {
			setIsSaving(false);
			setIsEditing(false);
		}, 500);
	};

	const handleDownload = () => {
		if (!content || !file?.name) return;

		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = file.name.split("/").pop() || "file.txt";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Sync scroll between textarea and line numbers
	useEffect(() => {
		const textarea = editorRef.current;
		const lineNumbers = lineNumbersRef;

		if (!textarea || !lineNumbers) return;

		const handleScroll = () => {
			lineNumbers.scrollTop = textarea.scrollTop;
		};

		textarea.addEventListener("scroll", handleScroll);
		return () => textarea.removeEventListener("scroll", handleScroll);
	}, [lineNumbersRef]);

	// Generate line numbers and apply syntax highlighting
	const renderLineNumbers = useCallback(() => {
		if (!content || isBinaryError) return null;

		const lines = content.split("\n");

		return (
			<div ref={setLineNumbersRef} className={editorStyles.lineNumbers}>
				{lines.map((line, i) => {
					// Determine line style based on content and file type
					let lineClass = editorStyles.lineNumber;

					if (fileType === "dockerfile") {
						if (line.trim().startsWith("#")) {
							lineClass = cn(lineClass, editorStyles.commentLine);
						} else if (
							/^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/i.test(
								line,
							)
						) {
							lineClass = cn(lineClass, editorStyles.instructionLine);
						}
					} else {
						// Basic syntax highlighting for other file types
						if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
							lineClass = cn(lineClass, editorStyles.commentLine);
						}
					}

					return (
						<div
							key={`line-${i}-${line.slice(0, 5).replace(/\s/g, "")}`}
							className={lineClass}
						>
							{i + 1}
						</div>
					);
				})}
			</div>
		);
	}, [content, fileType, isBinaryError]);

	// If no file is selected
	if (!file) {
		return (
			<div className="h-full w-full flex items-center justify-center text-gray-500">
				<p>Select a file to view its contents</p>
			</div>
		);
	}

	// If file is a directory
	if (file.type === "directory" || file.file_type === "directory") {
		return (
			<div className="h-full w-full flex items-center justify-center text-gray-500">
				<p>This is a directory. Select a file to view its contents.</p>
			</div>
		);
	}

	return (
		<div className="h-full w-full flex flex-col">
			<div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
				<div className="font-medium truncate">
					{file.name}
					{file.size && (
						<span className="ml-2 text-xs text-gray-500">{file.size}</span>
					)}
				</div>
				<div className="flex gap-2">
					{!isReadOnly && !isBinaryError && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditing(!isEditing)}
							className="flex items-center gap-1"
						>
							{isEditing ? (
								<Check className="h-4 w-4" />
							) : (
								<Edit className="h-4 w-4" />
							)}
							{isEditing ? "View" : "Edit"}
						</Button>
					)}
					{!isBinaryError && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownload}
							className="flex items-center gap-1"
						>
							<Download className="h-4 w-4" />
							Download
						</Button>
					)}
				</div>
			</div>

			<div className="flex-grow flex overflow-hidden">
				{isBinaryError ? (
					<div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
						<AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
						<h3 className="text-lg font-semibold mb-2">Cannot Display File</h3>
						<p className="text-gray-500 max-w-md">{content}</p>
						<p className="text-gray-500 mt-4 text-sm">
							This file may be binary or contain non-text content that cannot be
							displayed in the browser. You can still download the file to view
							it with an appropriate application.
						</p>
					</div>
				) : (
					<div className={cn(editorStyles.editor, "w-full")}>
						{renderLineNumbers()}
						<textarea
							ref={editorRef}
							value={content || ""}
							onChange={handleChange}
							readOnly={isReadOnly || !isEditing}
							spellCheck={false}
							className={editorStyles.textarea}
						/>
					</div>
				)}
			</div>

			{isEditing && !isReadOnly && !isBinaryError && (
				<div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
					<div className="flex justify-end">
						<Button
							variant="default"
							size="sm"
							onClick={handleSave}
							disabled={isSaving}
							className="flex items-center gap-1"
						>
							{isSaving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							Save
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

export default FileViewer;
