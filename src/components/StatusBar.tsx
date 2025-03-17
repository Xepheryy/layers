import { cn } from "@/lib/utils";
import useLayersStore from "@/store/useLayersStore";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StatusBarProps {
	className?: string;
}

export function StatusBar({ className }: StatusBarProps) {
	const { taskStatus, isLoading } = useLayersStore();

	if (!taskStatus && !isLoading) return null;

	return (
		<div
			className={cn(
				"h-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end px-4 text-sm",
				className,
			)}
		>
			{taskStatus ? (
				<div className="flex items-center">
					<div className="flex items-center mr-2">
						{taskStatus.isComplete ? (
							taskStatus.error ? (
								<AlertCircle className="h-4 w-4 text-red-500 mr-2" />
							) : (
								<CheckCircle className="h-4 w-4 text-green-500 mr-2" />
							)
						) : (
							<Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
						)}
						<span
							className={cn(
								"text-sm",
								taskStatus.error
									? "text-red-500"
									: taskStatus.isComplete
										? "text-green-500"
										: "text-muted-foreground",
							)}
						>
							{taskStatus.message}
						</span>
					</div>
					{!taskStatus.isComplete && (
						<Progress
							value={taskStatus.progress * 100}
							className="h-2 w-32 ml-2"
						/>
					)}
					{taskStatus.error && (
						<span className="text-xs text-red-500 ml-2 truncate max-w-md">
							{taskStatus.error}
						</span>
					)}
				</div>
			) : isLoading ? (
				<div className="flex items-center">
					<Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
					<span className="text-sm text-muted-foreground">Loading...</span>
				</div>
			) : null}
		</div>
	);
}
