import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
	value?: number;
	className?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
	({ className, value = 0, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800",
					className,
				)}
				{...props}
			>
				<div
					className="h-full bg-blue-500 dark:bg-blue-400 transition-all"
					style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
				/>
			</div>
		);
	},
);

Progress.displayName = "Progress";
