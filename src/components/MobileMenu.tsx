import { X, GitBranch, SettingsIcon, Sun, Moon } from "lucide-react"
import { LiquidGlassWrapper } from "./LiquidGlassWrapper"
import { ConversationStore } from "../conversationStore"
import { CompactAuthButton } from "./CompactAuthButton"
import { SendDataButton } from "./SendDataButton"
import { ReceiveDataButton } from "./ReceiveDataButton"

interface MobileMenuProps {
  showMobileMenu: boolean
  setShowMobileMenu: (show: boolean) => void
  isDark: boolean
  setIsDark: (isDark: boolean) => void
  hasConsented: boolean | null
  mode: "ephemeral" | "structured"
  setMode: (mode: "ephemeral" | "structured") => void | Promise<void>
  setShowBranchPanel: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  selectedModel: string
  setShowModelSwitchModal: (show: boolean) => void
  setPendingModelSelection: (model: string) => void
  verifyAttestation: () => void
  isVerifying: boolean
  attestation: any
  handleNewConversation: () => void
  apiKey: string | null
  openRouterApiKey: string | null
  handleLogout: () => void
  setShowApiKeyModal: (show: boolean) => void
  currentBranch: any
  messages: any[]
  handlePinConversation: () => void
  isSending: boolean
  isReceiving: boolean
  pipingSyncManager: any
  syncWarningAcknowledged: boolean
  setPendingSendAction: (pending: boolean) => void
  setShowSyncWarning: (show: boolean) => void
  setPendingReceiveAction: (action: string | null) => void
}

export const MobileMenu = ({
  showMobileMenu,
  setShowMobileMenu,
  isDark,
  setIsDark,
  hasConsented,
  mode,
  setMode,
  setShowBranchPanel,
  setShowSettings,
  selectedModel,
  setShowModelSwitchModal,
  setPendingModelSelection,
  verifyAttestation,
  isVerifying,
  attestation,
  handleNewConversation,
  apiKey,
  openRouterApiKey,
  handleLogout,
  setShowApiKeyModal,
  currentBranch,
  messages,
  handlePinConversation,
  isSending,
  isReceiving,
  pipingSyncManager,
  syncWarningAcknowledged,
  setPendingSendAction,
  setShowSyncWarning,
  setPendingReceiveAction
}: MobileMenuProps) => {
  if (!showMobileMenu) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setShowMobileMenu(false)}
      />
      <LiquidGlassWrapper
        className="fixed top-0 left-0 right-0 z-50 p-4 lg:hidden border-b"
        isDark={isDark}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Menu</h3>
          <button
            onClick={() => setShowMobileMenu(false)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Theme Toggle */}
          <div className="mb-3">
            <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              Appearance
            </h3>
            <button
              onClick={() => {
                const newTheme = !isDark;
                setIsDark(newTheme);
                
                // Theme change is always applied for current session
                // but only saved if user has consented
                if (hasConsented) {
                  console.log("Saving theme preference (mobile menu):", newTheme);
                }
              }}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                isDark
                  ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#2ecc71] border-[#2ecc71]/30"
                  : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#54ad95] border-[#54ad95]/30"
              } backdrop-blur-sm border flex items-center justify-center gap-2`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
          </div>

          {/* Wallet Connect */}
          <div className="mb-3">
            <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              Wallet Connection
            </h3>
            <div className="flex justify-center">
              <CompactAuthButton isDark={isDark} />
            </div>
          </div>

          {/* Sync Buttons */}
          <div className="mb-3">
            <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              Data Sync
            </h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <SendDataButton
                  isDark={isDark}
                  isSending={isSending}
                  syncCode={isSending ? pipingSyncManager.getCurrentSendPath() : undefined}
                  onClick={() => {
                    if (!isSending) {
                      if (syncWarningAcknowledged) {
                        pipingSyncManager.startSending();
                      } else {
                        setPendingSendAction(true);
                        setShowSyncWarning(true);
                      }
                    } else {
                      pipingSyncManager.stopSending();
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <ReceiveDataButton
                  isDark={isDark}
                  isReceiving={isReceiving}
                  onClick={(path) => {
                    if (!isReceiving && path) {
                      if (syncWarningAcknowledged) {
                        pipingSyncManager.startReceiving(path);
                      } else {
                        setPendingReceiveAction(path);
                        setShowSyncWarning(true);
                      }
                    } else if (isReceiving) {
                      pipingSyncManager.stopReceiving();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Branches Button - Only show in structured mode */}
          {mode === "structured" && (
            <button
              onClick={() => {
                setShowBranchPanel(true);
                setShowMobileMenu(false);
              }}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                isDark
                  ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4] border-[#03a9f4]/30"
                  : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
              } backdrop-blur-sm border flex items-center justify-center gap-2`}
            >
              <GitBranch className="w-4 h-4" />
              View Branches
            </button>
          )}
          
          {/* Settings Button for Mobile */}
          <div className="mb-3">
            <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              Settings
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowMobileMenu(false);
                }}
                className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                  isDark
                    ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4] border-[#03a9f4]/30"
                    : "bg-[#0088fb]/20 hover:bg-[#0088fb]/30 text-[#0088fb] border-[#0088fb]/30"
                } backdrop-blur-sm border flex items-center justify-center gap-2`}
              >
                <SettingsIcon className="w-4 h-4" />
                Open Settings
              </button>
            </div>
          </div>
          
          {/* Mode Switcher */}
          <div className={`flex rounded-xl p-1 ${
            isDark ? "bg-[#333333]/60" : "bg-[#f0f8ff]/60"
          } backdrop-blur-sm border ${isDark ? "border-[#2ecc71]/30" : "border-[#0088fb]/30"}`}>
            <button
              onClick={() => {
                setMode("ephemeral")
                setShowMobileMenu(false)
              }}
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                mode === "ephemeral"
                  ? isDark ? "bg-[#2ecc71]/30 text-[#2ecc71]" : "bg-[#54ad95]/20 text-[#00171c]"
                  : isDark ? "text-[#f0f8ff]" : "text-[#00171c]/70"
              }`}
            >
              ⚡ Ephemeral
            </button>
            <button
              onClick={() => {
                setMode("structured")
                if (!currentBranch && messages.length > 0) {
                  handlePinConversation()
                }
                setShowMobileMenu(false)
              }}
              className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                mode === "structured"
                  ? isDark ? "bg-[#03a9f4]/30 text-[#03a9f4]" : "bg-[#54ad95]/20 text-[#54ad95]"
                  : isDark ? "text-[#f0f8ff]" : "text-[#00171c]/70"
              }`}
            >
              🌿 Structured
            </button>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => {
              const newModel = e.target.value;
              // Instead of immediately changing the model, store it as pending and show confirmation
              setPendingModelSelection(newModel);
              setShowModelSwitchModal(true);
            }}
            className={`w-full px-4 py-3 text-base rounded-xl ${
              isDark ? "bg-[#333333]/60 border-[#2ecc71]/30 text-[#f0f8ff]" : "bg-[#f0f8ff]/60 border-[#54ad95]/30 text-[#00171c]"
            } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
              isDark ? "focus:ring-[#2ecc71]/50" : "focus:ring-[#54ad95]/50"
            }`}
          >
            {ConversationStore.getAvailableModels().map((model) => (
              <option key={model.id} value={model.id} className={isDark ? "bg-gray-800" : "bg-white"}>
                {model.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              verifyAttestation()
              // Keep menu open to show verification status
            }}
            className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
              isDark
                ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
            } backdrop-blur-sm border`}
            disabled={isVerifying}
          >
            {isVerifying ? "Verifying..." : attestation ? "✓ Verified" : "Verify Privacy"}
          </button>
          {attestation && attestation.signing_address && (
            <div className={`text-xs mt-1 text-center truncate ${
              isDark ? "text-[#2ecc71]/70" : "text-[#54ad95]/70"
            }`} title={attestation.signing_address}>
              {attestation.signing_address.substring(0, 10)}...{attestation.signing_address.substring(attestation.signing_address.length - 6)}
            </div>
          )}
          {isVerifying && (
            <div className="flex justify-center mt-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}

          <button
            onClick={handleNewConversation}
            className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
              isDark
                ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/20"
                : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#00171c] border-[#0088fb]/20"
            } backdrop-blur-sm border`}
          >
            New Conversation
          </button>

          {apiKey || openRouterApiKey ? (
            <button
              onClick={handleLogout}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                isDark
                  ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-[#54ad95]/30"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-700 border-[#0088fb]/30"
              } backdrop-blur-sm border`}
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => {
                setShowApiKeyModal(true)
                setShowMobileMenu(false)
              }}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                isDark
                  ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                  : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
              } backdrop-blur-sm border`}
            >
              Login with API Key
            </button>
          )}
        </div>
      </LiquidGlassWrapper>
    </>
  )
}