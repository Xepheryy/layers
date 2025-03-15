import { useState, useEffect, useCallback, type FC, type ChangeEvent } from 'react';
import type { DockerfileAnalysis } from '../utils/types';

// Define tooltips for common Dockerfile commands
const DOCKERFILE_TOOLTIPS: Record<string, string> = {
  'FROM': 'Sets the base image for subsequent instructions.',
  'RUN': 'Executes commands in a new layer on top of the current image and commits the results.',
  'CMD': 'Provides default commands for an executing container.',
  'LABEL': 'Adds metadata to an image.',
  'EXPOSE': 'Informs Docker that the container listens on the specified network ports at runtime.',
  'ENV': 'Sets the environment variable.',
  'ADD': 'Copies new files, directories or remote file URLs and adds them to the filesystem of the image.',
  'COPY': 'Copies new files or directories and adds them to the filesystem of the container.',
  'ENTRYPOINT': 'Configures a container that will run as an executable.',
  'VOLUME': 'Creates a mount point and marks it as holding externally mounted volumes.',
  'USER': 'Sets the user name or UID to use when running the image.',
  'WORKDIR': 'Sets the working directory for any RUN, CMD, ENTRYPOINT, COPY and ADD instructions.',
  'ARG': 'Defines a variable that users can pass at build-time to the builder.',
  'ONBUILD': 'Adds a trigger instruction when the image is used as the base for another build.',
  'STOPSIGNAL': 'Sets the system call signal that will be sent to the container to exit.',
  'HEALTHCHECK': 'Tells Docker how to test a container to check that it is still working.',
  'SHELL': 'Allows the default shell used for the shell form of commands to be overridden.',
};

type DockerfileEditorProps = {
  content: string;
  onChange: (content: string) => void;
  onAnalyze: (content: string) => void;
  analysis?: DockerfileAnalysis | null;
  isReadOnly?: boolean;
};

const DockerfileEditor: FC<DockerfileEditorProps> = ({
  content,
  onChange,
  onAnalyze,
  analysis,
  isReadOnly = false
}) => {
  const [editorContent, setEditorContent] = useState<string>(content);
  // Tooltip state is no longer used but kept for future enhancement
  const [_tooltip, _setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditorContent(newContent);
    onChange(newContent);
    
    // Update highlighted lines
    highlightContent(newContent);
  };

  // Memoize the highlightContent function to prevent unnecessary re-renders
  const highlightContent = useCallback((text: string) => {
    // Simple line-by-line syntax highlighting
    const lines = text.split('\n');
    const highlighted = lines.map(line => {
      const trimmedLine = line.trim();
      // Find first word (command)
      const parts = trimmedLine.split(' ');
      const command = parts[0]?.toUpperCase();
      
      if (command && DOCKERFILE_TOOLTIPS[command]) {
        return `<span class="text-blue-600 font-semibold" data-command="${command}">${command}</span>${line.substring(command.length)}`;
      }
      return line;
    });
    
    setHighlightedLines(highlighted);
  }, []);

  useEffect(() => {
    highlightContent(editorContent);
  }, [editorContent, highlightContent]);

  // Using state to handle tooltip without event handlers
  // Since we're using a pre element for the content viewer
  // The tooltip functionality has been disabled for now

  return (
    <div className="h-full w-full flex flex-col bg-gray-100">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Dockerfile Editor</h2>
        <button
          type="button"
          onClick={() => onAnalyze(editorContent)}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          aria-label="Analyze Dockerfile"
        >
          {analysis ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden">
        {analysis && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-medium text-blue-700 mb-1">Analysis Results:</p>
            <ul className="list-disc ml-4 text-blue-600">
              {analysis.layerImpact?.map((item) => (
                <li key={`impact-${item.lineNumber}-${item.instruction}`} className="mb-1">
                  Line {item.lineNumber}: <span className="font-semibold">{item.instruction}</span> - {item.impact}
                </li>
              ))}
            </ul>
            {analysis.optimizationSuggestions?.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-blue-700 mb-1">Suggestions:</p>
                <ul className="list-disc ml-4 text-blue-600">
                  {analysis.optimizationSuggestions.map((suggestion) => (
                    <li key={`suggestion-${suggestion.title}`} className="mb-1">
                      <span className="font-semibold">{suggestion.title}</span>: {suggestion.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="h-full relative overflow-hidden rounded border border-gray-200 bg-white">
          {isReadOnly ? (
            <pre 
              className="h-full w-full p-4 font-mono text-sm overflow-auto"
              aria-label="Dockerfile content viewer"
            >
              {highlightedLines.map((line, i) => {
                // Create a unique key using line content and index for better React performance
                const key = `line-${line.slice(0, 10)}-${i}`;
                // Safe rendering alternative to dangerouslySetInnerHTML
                return (
                  <code key={key} className="dockerfile-line block">
                    {line.includes('<span class="text-blue-600 font-semibold"') ? (
                      <span className="text-blue-600 font-semibold">
                        {line.replace(/<[^>]*>/g, '').trim() || '\u00A0'}
                      </span>
                    ) : (
                      line || '\u00A0'
                    )}
                  </code>
                );
              })}
            </pre>
          ) : (
            <textarea
              value={editorContent}
              onChange={handleChange}
              className="h-full w-full p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder="Enter your Dockerfile here..."
              readOnly={isReadOnly}
            />
          )}
          
          {/* Tooltip is disabled for now */}
        </div>
      </div>
    </div>
  );
};

export default DockerfileEditor;
