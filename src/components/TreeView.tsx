import { useState, type FC } from "react";

export interface TreeNode {
	id: string;
	name: string;
	type: "file" | "directory";
	path: string;
	size?: string;
	content?: string;
	children?: TreeNode[];
	isExpanded?: boolean;
}

interface TreeViewProps {
	nodes: TreeNode[];
	onSelectNode: (node: TreeNode) => void;
	selectedNodeId?: string | null;
}

const ChevronIcon: FC<{ isExpanded: boolean }> = ({ isExpanded }) => (
	<svg
		className={`w-4 h-4 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			d="M9 5l7 7-7 7"
		/>
	</svg>
);

const FolderIcon: FC<{ isOpen: boolean }> = ({ isOpen }) => (
	<svg
		className="w-5 h-5 text-yellow-500"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		{isOpen ? (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
			/>
		) : (
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
			/>
		)}
	</svg>
);

const FileIcon: FC = () => (
	<svg
		className="w-5 h-5 text-gray-500"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
		/>
	</svg>
);

const TreeNodeComponent: FC<{
	node: TreeNode;
	level: number;
	onSelect: (node: TreeNode) => void;
	onToggleExpand: (node: TreeNode) => void;
	isSelected: boolean;
}> = ({ node, level, onSelect, onToggleExpand, isSelected }) => {
	const isDirectory = node.type === "directory";
	const hasChildren = isDirectory && node.children && node.children.length > 0;

	const handleClick = () => {
		if (isDirectory && hasChildren) {
			onToggleExpand(node);
		}
		onSelect(node);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			handleClick();
			e.preventDefault();
		}
	};

	return (
		<li className="select-none">
			<button
				type="button"
				className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded w-full text-left ${isSelected ? "bg-blue-100" : ""}`}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				aria-expanded={isDirectory ? node.isExpanded : undefined}
				aria-selected={isSelected}
				style={{ paddingLeft: `${level * 16 + 8}px` }}
			>
				{isDirectory && hasChildren && (
					<span className="mr-1">
						<ChevronIcon isExpanded={!!node.isExpanded} />
					</span>
				)}

				{isDirectory ? <FolderIcon isOpen={!!node.isExpanded} /> : <FileIcon />}

				<span className="ml-2 text-sm truncate">{node.name}</span>

				{node.size && !isDirectory && (
					<span className="ml-auto text-xs text-gray-500">{node.size}</span>
				)}
			</button>

			{isDirectory && node.isExpanded && node.children && (
				<div>
					{node.children.map((childNode) => (
						<TreeNodeComponent
							key={childNode.id}
							node={childNode}
							level={level + 1}
							onSelect={onSelect}
							onToggleExpand={onToggleExpand}
							isSelected={isSelected && childNode.id === node.id}
						/>
					))}
				</div>
			)}
		</li>
	);
};

const TreeView: FC<TreeViewProps> = ({
	nodes,
	onSelectNode,
	selectedNodeId,
}) => {
	const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(
		{},
	);

	// Process nodes to add isExpanded flag based on expandedNodes state
	const processedNodes = nodes.map((node) => ({
		...node,
		isExpanded: expandedNodes[node.id] || false,
		children: node.children
			? node.children.map((child) => ({
					...child,
					isExpanded: expandedNodes[child.id] || false,
				}))
			: undefined,
	}));

	const handleToggleExpand = (node: TreeNode) => {
		setExpandedNodes((prev) => ({
			...prev,
			[node.id]: !prev[node.id],
		}));
	};

	return (
		<ul
			className="h-full overflow-auto px-2 py-2 list-none m-0 p-0"
			aria-label="File and directory tree"
		>
			{processedNodes.map((node) => (
				<TreeNodeComponent
					key={node.id}
					node={node}
					level={0}
					onSelect={onSelectNode}
					onToggleExpand={handleToggleExpand}
					isSelected={selectedNodeId === node.id}
				/>
			))}
		</ul>
	);
};

export default TreeView;
