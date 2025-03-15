import { useState, type FC } from 'react';

interface SettingsProps {
  onSettingsChange?: (settings: AppSettings) => void;
  initialSettings?: AppSettings;
  onClose?: () => void;
}

export interface AppSettings {
  darkMode: boolean;
  autoRefresh: boolean;
  cacheResults: boolean;
}

const Settings: FC<SettingsProps> = ({ onSettingsChange, initialSettings, onClose }) => {
  const defaultSettings: AppSettings = {
    darkMode: false,
    autoRefresh: true,
    cacheResults: true
  };
  
  const [settings, setSettings] = useState<AppSettings>(initialSettings || defaultSettings);
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSettingChange = (key: keyof AppSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };
  
  // Common settings toggle switches component to reduce duplication
  const SettingToggles = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="dark-mode" className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</label>
        <div className="relative inline-block w-10 align-middle select-none">
          <input 
            type="checkbox" 
            id="dark-mode" 
            checked={settings.darkMode} 
            onChange={e => handleSettingChange('darkMode', e.target.checked)}
            className="sr-only"
          />
          <div className={`block w-10 h-6 rounded-full ${settings.darkMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`absolute left-1 top-1 bg-white dark:bg-gray-200 w-4 h-4 rounded-full transition-transform ${settings.darkMode ? 'transform translate-x-4' : ''}`} />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <label htmlFor="auto-refresh" className="text-sm text-gray-700 dark:text-gray-300">Auto Refresh</label>
        <div className="relative inline-block w-10 align-middle select-none">
          <input 
            type="checkbox" 
            id="auto-refresh" 
            checked={settings.autoRefresh} 
            onChange={e => handleSettingChange('autoRefresh', e.target.checked)}
            className="sr-only"
          />
          <div className={`block w-10 h-6 rounded-full ${settings.autoRefresh ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`absolute left-1 top-1 bg-white dark:bg-gray-200 w-4 h-4 rounded-full transition-transform ${settings.autoRefresh ? 'transform translate-x-4' : ''}`} />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <label htmlFor="cache-results" className="text-sm text-gray-700 dark:text-gray-300">Cache Results</label>
        <div className="relative inline-block w-10 align-middle select-none">
          <input 
            type="checkbox" 
            id="cache-results" 
            checked={settings.cacheResults} 
            onChange={e => handleSettingChange('cacheResults', e.target.checked)}
            className="sr-only"
          />
          <div className={`block w-10 h-6 rounded-full ${settings.cacheResults ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`absolute left-1 top-1 bg-white dark:bg-gray-200 w-4 h-4 rounded-full transition-transform ${settings.cacheResults ? 'transform translate-x-4' : ''}`} />
        </div>
      </div>
    </div>
  );

  // If onClose is provided, render as a modal
  if (onClose) {
    return (
      <div className="w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b dark:border-gray-700">
          <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close settings"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="img" aria-label="Close icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Appearance & Behavior</h3>
          <SettingToggles />
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Otherwise render as a dropdown
  return (
    <div className="relative">
      {/* Settings Icon Button */}
      <button
        type="button"
        onClick={toggleSettings}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open settings"
      >
        <svg 
          className="w-6 h-6 text-gray-600 dark:text-gray-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Settings icon"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
      
      {/* Settings Panel Popup */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Settings</h3>
          <SettingToggles />
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={toggleSettings}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
