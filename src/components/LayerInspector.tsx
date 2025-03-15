import type { FC } from 'react';
import type { DockerLayer, FileItem } from '../utils/types';

interface LayerInspectorProps {
  layer: DockerLayer | null;
  nextLayer?: DockerLayer | null;
  selectedFile: FileItem | null;
  darkMode: boolean;
}

const LayerInspector: FC<LayerInspectorProps> = ({ 
  layer, 
  nextLayer, 
  selectedFile,
  darkMode 
}) => {
  if (!layer) {
    return (
      <div className={`h-full flex items-center justify-center ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-white text-gray-600'}`}>
        <p className="text-lg">Select a layer to view details</p>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-auto ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
      <div className={`sticky top-0 z-10 px-6 py-4 border-b ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className="text-xl font-semibold mb-1">Layer Details</h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inspect Docker layer and its contents</p>
      </div>
      
      <div className="p-6">
        {/* Layer basic info card */}
        <div className={`p-4 mb-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Layer Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID</p>
              <p className={`text-sm font-mono mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{layer.id.substring(0, 12)}</p>
            </div>
            
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{layer.name}</p>
            </div>
            
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Size</p>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{layer.size}</p>
            </div>
            
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created</p>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {new Date(layer.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Command card */}
        <div className={`p-4 mb-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Dockerfile Command</h3>
          <div className={`p-3 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <code className="text-sm font-mono whitespace-pre-wrap">{layer.command}</code>
          </div>
        </div>
        
        {/* Files section */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Files Added</h3>
          
          {layer.files.length === 0 ? (
            <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No files added in this layer</p>
          ) : (
            <div className={`border rounded ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <div className="col-span-6">Name</div>
                <div className="col-span-4">Path</div>
                <div className="col-span-2">Size</div>
              </div>
              
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {layer.files.map((file, index) => (
                  <div 
                    key={`${file.path}-${index}`} 
                    className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm ${
                      selectedFile && selectedFile.path === file.path 
                        ? `${darkMode ? 'bg-blue-900 bg-opacity-40' : 'bg-blue-50'}` 
                        : ''
                    }`}
                  >
                    <div className="col-span-6 flex items-center">
                      {file.type === 'directory' ? (
                        <svg 
                          className={`w-4 h-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="Folder icon"
                        >
                          <title>Folder icon</title>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      ) : (
                        <svg 
                          className={`w-4 h-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="File icon"
                        >
                          <title>File icon</title>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{file.name}</span>
                    </div>
                    <div className={`col-span-4 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {file.path}
                    </div>
                    <div className={`col-span-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {file.size || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Layer changes section - show if next layer exists */}
        {nextLayer && (
          <div className={`p-4 mt-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Changes in Next Layer</h3>
            <div className={`p-3 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="font-semibold">Command:</span> {nextLayer.command}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="font-semibold">Size impact:</span> {nextLayer.size}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerInspector;
