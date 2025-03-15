import { useState, type FC } from 'react';
import TreeView from './TreeView';
import type { TreeNode } from './TreeView';

type CollapsibleSidebarProps = {
  layers: Array<{
    id: string;
    name: string;
    command: string;
    size: string;
    isSelected: boolean;
  }>;
  treeViewData: TreeNode[];
  onSelectLayer: (id: string) => void;
  onSelectNode: (node: TreeNode) => void;
  selectedNodeId: string | null;
  darkMode: boolean;
};

const CollapsibleSidebar: FC<CollapsibleSidebarProps> = ({ 
  layers, 
  treeViewData, 
  onSelectLayer, 
  onSelectNode, 
  selectedNodeId,
  darkMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'files'>('layers');

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const switchTab = (tab: 'layers' | 'files') => {
    setActiveTab(tab);
  };

  return (
    <div className={`transition-all duration-300 flex flex-col border-r ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
         style={{ width: isCollapsed ? '3rem' : '16rem' }}>
      
      {/* Sidebar Header with Collapse Button */}
      <div className={`flex justify-between items-center p-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {!isCollapsed && (
          <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Explorer
          </h2>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`p-1 rounded hover:bg-opacity-20 ${darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <title>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</title>
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Tab Navigation (only shown when expanded) */}
      {!isCollapsed && (
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            type="button"
            className={`flex-1 py-2 px-3 text-sm font-medium ${
              activeTab === 'layers' 
                ? `${darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}` 
                : `${darkMode ? 'text-gray-400' : 'text-gray-600'}`
            }`}
            onClick={() => switchTab('layers')}
          >
            Layers
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-3 text-sm font-medium ${
              activeTab === 'files' 
                ? `${darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}` 
                : `${darkMode ? 'text-gray-400' : 'text-gray-600'}`
            }`}
            onClick={() => switchTab('files')}
          >
            Files
          </button>
        </div>
      )}

      {/* Collapsed View - Just Icons */}
      {isCollapsed && (
        <div className="flex flex-col items-center pt-3 space-y-4">
          <button
            type="button"
            className={`p-2 rounded-md ${
              activeTab === 'layers' 
                ? `${darkMode ? 'bg-gray-700 text-blue-400' : 'bg-gray-200 text-blue-600'}` 
                : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
            }`}
            onClick={() => switchTab('layers')}
            aria-label="View layers"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Layers icon"
            >
              <title>Layers icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
          <button
            type="button"
            className={`p-2 rounded-md ${
              activeTab === 'files' 
                ? `${darkMode ? 'bg-gray-700 text-blue-400' : 'bg-gray-200 text-blue-600'}` 
                : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
            }`}
            onClick={() => switchTab('files')}
            aria-label="View files"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Files icon"
            >
              <title>Files icon</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!isCollapsed && activeTab === 'layers' && (
          <ul className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {layers.map((layer) => (
              <li key={layer.id} className="list-none">
                <button
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  aria-pressed={layer.isSelected}
                  className={`w-full text-left p-3 transition-colors ${
                    layer.isSelected 
                      ? `${darkMode ? 'bg-gray-700' : 'bg-blue-100'}` 
                      : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`
                  } ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {layer.name}
                      </p>
                      <p className={`text-xs truncate mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {layer.command}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {layer.size}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!isCollapsed && activeTab === 'files' && (
          <div className="h-full">
            <TreeView
              nodes={treeViewData}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId}
            />
          </div>
        )}

        {/* Just show icons for content in collapsed state */}
        {isCollapsed && activeTab === 'layers' && (
          <ul className="mt-2">
            {layers.map((layer) => (
              <li key={layer.id} className="px-1 py-2">
                <button
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  aria-label={`Select layer ${layer.name}`}
                  className={`flex justify-center w-full p-1 rounded-md ${
                    layer.isSelected 
                      ? `${darkMode ? 'bg-gray-700 text-blue-400' : 'bg-blue-100 text-blue-600'}` 
                      : `${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
                  }`}
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label={`Layer ${layer.name}`}
                  >
                    <title>Layer {layer.name}</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isCollapsed && activeTab === 'files' && (
          <div className="mt-2 px-1">
            {treeViewData.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className={`w-full p-2 text-xs rounded-md ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
              >
                <svg 
                  className="w-5 h-5 mx-auto" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label="Expand to see files"
                >
                  <title>Expand to see files</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleSidebar;
