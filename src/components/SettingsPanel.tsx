import { ChevronDown, ChevronUp, SettingsIcon, Key, Download } from "lucide-react"
import { LiquidGlassWrapper } from "./LiquidGlassWrapper"

interface SettingsPanelProps {
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  isDark: boolean
  setShowApiKeyModal: (show: boolean) => void
  apiKey: string | null
  openRouterApiKey: string | null
  temperature: number
  setTemperature: (temp: number) => void
  maxTokens: number
  setMaxTokens: (tokens: number) => void
  enableTimestamps: boolean
  setEnableTimestamps: (enable: boolean) => void
  showTimestamps: boolean
  setShowTimestamps: (show: boolean) => void
  hasConsented: boolean | null
  setHasConsented: (consent: boolean) => void
  exportWithSystemPrompt: boolean
  setExportWithSystemPrompt: (include: boolean) => void
  handleExport: () => void
  messages: any[]
}

export const SettingsPanel = ({
  showSettings,
  setShowSettings,
  isDark,
  setShowApiKeyModal,
  apiKey,
  openRouterApiKey,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  enableTimestamps,
  setEnableTimestamps,
  showTimestamps,
  setShowTimestamps,
  hasConsented,
  setHasConsented,
  exportWithSystemPrompt,
  setExportWithSystemPrompt,
  handleExport,
  messages
}: SettingsPanelProps) => {
  return (
    <div className={`mb-4 transition-all duration-300 ${showSettings ? 'mb-12' : ''}`}>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
          isDark
            ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/30"
            : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#00171c] border-[#54ad95]/30"
        } backdrop-blur-sm border text-sm font-medium`}
      >
        <SettingsIcon className="w-4 h-4" />
        Settings
        {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {showSettings && (
        <LiquidGlassWrapper
          className="settings-panel mt-2 rounded-xl max-h-[35vh] overflow-hidden"
          isDark={isDark}
        >
          {/* Scrollable content wrapper */}
          <div className="max-h-[35vh] overflow-y-auto p-4">
            {/* Settings content - Authentication and Sync UI removed */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Key Settings */}
            <div className="md:col-span-2">
              <h4 className={`text-base font-semibold mb-3 ${isDark ? "text-gray-100" : "text-gray-800"}`}>API Keys</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowApiKeyModal(true);
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                    isDark
                      ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/30"
                      : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#00171c] border-[#54ad95]/30"
                  } backdrop-blur-sm border`}
                >
                  <Key className="w-4 h-4" />
                  {apiKey || openRouterApiKey ? "Update" : "Set"} API Keys
                </button>
              </div>
            </div>

            {/* Model Settings */}
            <div className="md:col-span-2 pt-4 border-t border-gray-500/20">
              <h4 className={`text-base font-semibold mb-3 ${isDark ? "text-gray-100" : "text-gray-800"}`}>Model Settings</h4>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Lower values = more focused, higher values = more creative
                </p>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Maximum length of the response
              </p>
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                  Add Timestamps to Messages (Your Local Time)
                </label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-timestamps"
                    checked={enableTimestamps}
                    onChange={() => {
                      console.log("Toggling enableTimestamps from", enableTimestamps, "to", !enableTimestamps);
                      setEnableTimestamps(!enableTimestamps);
                    }}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label
                    htmlFor="toggle-timestamps"
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                      enableTimestamps
                        ? isDark ? "bg-[#2ecc71]" : "bg-[#54ad95]"
                        : isDark ? "bg-gray-600" : "bg-gray-300"
                    }`}
                  ></label>
                </div>
              </div>
              
              {enableTimestamps && (
                <div className="mt-2 flex items-center justify-between">
                  <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    Show Timestamps in Messages
                  </label>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      id="toggle-show-timestamps"
                      checked={showTimestamps}
                      onChange={() => setShowTimestamps(!showTimestamps)}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label
                      htmlFor="toggle-show-timestamps"
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                        showTimestamps
                          ? isDark ? "bg-[#2ecc71]" : "bg-[#54ad95]"
                          : isDark ? "bg-gray-600" : "bg-gray-300"
                      }`}
                    ></label>
                  </div>
                </div>
              )}
            </div>
            
            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-500/20">
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                  Save Preferences to Device
                </label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-consent"
                    checked={hasConsented === true}
                    onChange={() => {
                      const newConsent = hasConsented !== true;
                      setHasConsented(newConsent);
                      
                      console.log("Consent preference updated:", newConsent);
                    }}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label
                    htmlFor="toggle-consent"
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                      hasConsented
                        ? isDark ? "bg-[#2ecc71]" : "bg-[#54ad95]"
                        : isDark ? "bg-gray-600" : "bg-gray-300"
                    }`}
                  ></label>
                </div>
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {hasConsented
                  ? "Your preferences will be saved to this device"
                  : "Your preferences will only be used for this session"}
              </p>
            </div>
          </div>
          
          <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-500/20">
            <h4 className={`text-base font-semibold mb-3 ${isDark ? "text-gray-100" : "text-gray-800"}`}>Export</h4>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                Include system prompt in export
              </label>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="toggle-export-system-prompt"
                  checked={exportWithSystemPrompt}
                  onChange={() => setExportWithSystemPrompt(!exportWithSystemPrompt)}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="toggle-export-system-prompt"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    exportWithSystemPrompt
                      ? isDark ? "bg-[#2ecc71]" : "bg-[#54ad95]"
                      : isDark ? "bg-gray-600" : "bg-gray-300"
                  }`}
                ></label>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={messages.length === 0}
              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                isDark
                  ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/30"
                  : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#00171c] border-[#54ad95]/30"
              } backdrop-blur-sm border disabled:opacity-50`}
            >
              <Download className="w-4 h-4" />
              Export as Markdown
            </button>
            </div>
            {/* No toggle buttons as requested */}
            
          </div>
        </LiquidGlassWrapper>
      )}
    </div>
  )
}