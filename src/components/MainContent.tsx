import React from 'react';
import type { FileItem, DockerLayer } from '../utils/types';

type MainContentProps = {
  selectedLayer: DockerLayer | null;
  nextLayer: DockerLayer | null;
  onSelectFile: (file: FileItem) => void;
};

const MainContent: React.FC<MainContentProps> = ({ 
  selectedLayer, 
  nextLayer,
  onSelectFile 
}) => {
  const [activeTab, setActiveTab] = React.useState<'files' | 'diff'>('files');

  if (!selectedLayer) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No layer selected</h3>
          <p className="mt-1 text-sm text-gray-400">Select a layer from the sidebar to view details</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Layer Details</h2>
        <p className="text-sm text-gray-500">ID: {selectedLayer.id.substring(0, 12)}</p>
      </div>
      
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Command</p>
            <p className="text-sm font-mono truncate">{selectedLayer.command}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Size</p>
            <p className="text-sm">{selectedLayer.size}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="text-sm">{selectedLayer.createdAt}</p>
          </div>
        </div>
      </div>
      
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            type="button"
            onClick={() => setActiveTab('files')} 
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'files' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'diff'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={!nextLayer}
          >
            Diff with Next Layer
          </button>
        </nav>
      </div>
      
      <div className="flex-1 overflow-auto p-2">
        {activeTab === 'files' ? (
          <div className="bg-white rounded border border-gray-200">
            {selectedLayer.files.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No files available in this layer
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedLayer.files.map((file) => (
                    <tr 
                      key={file.path} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelectFile(file)}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectFile(file)}
                      tabIndex={0}
                      role="button"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="mr-2">
                            {file.type === 'directory' ? (
                              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-label="Directory icon" role="img">
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-label="File icon" role="img">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{file.type}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{file.size || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="bg-white rounded border border-gray-200 p-4">
            {!nextLayer ? (
              <div className="text-center text-gray-500">
                This is the last layer
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500">Comparing layer</p>
                  <p className="text-sm font-mono">{selectedLayer.id.substring(0, 12)}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500">With next layer</p>
                  <p className="text-sm font-mono">{nextLayer.id.substring(0, 12)}</p>
                  <p className="text-xs text-gray-500 mt-1">Command: {nextLayer.command}</p>
                </div>
                
                <div className="border border-gray-200 rounded">
                  {/* Simple diff implementation - could be enhanced */}
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium">Changes</p>
                  </div>
                  <div className="p-2 font-mono text-sm">
                    <p className="text-green-600">+ Added files would be shown here</p>
                    <p className="text-red-600">- Removed files would be shown here</p>
                    <p className="text-amber-600">~ Modified files would be shown here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;
