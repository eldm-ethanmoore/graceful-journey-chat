import { Sun, Moon, Menu } from "lucide-react"
import { CompactAuthButton } from "./CompactAuthButton"
import { SendDataButton } from "./SendDataButton"
import { ReceiveDataButton } from "./ReceiveDataButton"
import { ConversationStore } from "../conversationStore"
import gjPalmLight from "../assets/gj-palm-light-mode.png"
import gjPalmDark from "../assets/gj-palm-dark-mode.png"

interface HeaderSectionProps {
  isDark: boolean
  setIsDark: (isDark: boolean) => void
  hasConsented: boolean | null
  mode: "ephemeral" | "structured"
  setMode: (mode: "ephemeral" | "structured") => void | Promise<void>
  setShowBranchPanel: (show: boolean) => void
  setShowMobileMenu: (show: boolean) => void
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
  selectedModel: string
  setSelectedModel: (model: string) => void
  setPendingModelSelection: (model: string) => void
  setShowModelSwitchModal: (show: boolean) => void
  verifyAttestation: () => void
  isVerifying: boolean
  attestation: any
  apiKey: string | null
  openRouterApiKey: string | null
  handleLogout: () => void
  setShowApiKeyModal: (show: boolean) => void
}

export const HeaderSection = ({
  isDark,
  setIsDark,
  hasConsented,
  mode,
  setMode,
  setShowBranchPanel,
  setShowMobileMenu,
  currentBranch,
  messages,
  handlePinConversation,
  isSending,
  isReceiving,
  pipingSyncManager,
  syncWarningAcknowledged,
  setPendingSendAction,
  setShowSyncWarning,
  setPendingReceiveAction,
  selectedModel,
  setSelectedModel,
  setPendingModelSelection,
  setShowModelSwitchModal,
  verifyAttestation,
  isVerifying,
  attestation,
  apiKey,
  openRouterApiKey,
  handleLogout,
  setShowApiKeyModal
}: HeaderSectionProps) => {
  return (
    <div className={`transition-all duration-500 ${
      isDark ? "bg-[#1a1d23]/80 border-b border-[#2ecc71]/30" : "bg-[#f0f8ff]/80 border-b border-[#54ad95]/20"
    } backdrop-blur-xl sticky top-0 z-30`}>
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (mode === "structured") {
                  setShowBranchPanel(true)
                } else {
                  setShowMobileMenu(true)
                }
              }}
              aria-label="Menu"
              className={`p-2 rounded-lg transition-colors duration-300 ${
                isDark ? "hover:bg-white/10" : "hover:bg-black/10"
              } lg:hidden`}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Desktop branch toggle */}
            <button
              onClick={() => {
                if (mode !== "structured") {
                  setMode("structured");
                  if (!currentBranch && messages.length > 0) {
                    handlePinConversation();
                  }
                } else {
                  setShowBranchPanel(true);
                }
              }}
              className={`p-2 rounded-lg transition-colors duration-300 hidden lg:block ${
                isDark ? "hover:bg-white/10" : "hover:bg-black/10"
              }`}
              aria-label="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                  className={isDark ? "text-white" : "text-gray-900"}
                />
              </svg>
            </button>
            
            <img
              src={isDark ? gjPalmLight : gjPalmDark}
              alt="GJ Palm Logo"
              className="w-6 h-6"
              style={{
                filter: isDark
                  ? "brightness(0) saturate(100%) invert(64%) sepia(69%) saturate(458%) hue-rotate(93deg) brightness(95%) contrast(89%)" // Green for dark mode (#2ecc71)
                  : "brightness(0) saturate(100%) invert(47%) sepia(97%) saturate(1917%) hue-rotate(190deg) brightness(97%) contrast(101%)" // Blue for light mode (#0088fb)
              }}
            />
            <h1 className={`text-xs lg:text-sm font-bold transition-colors duration-500 ${
              isDark ? "text-white" : "text-gray-900"
            }`}>
              Graceful Journey Chat
            </h1>
          </div>

          {/* Right side - Desktop controls */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Wallet Connect Button */}
            <div className="flex items-center ml-12">
              <CompactAuthButton
                isDark={isDark}
              />
            </div>
            
            {/* Sync Buttons */}
            <div className="flex items-center gap-2">
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
            
            
            {/* Mode Switcher */}
            <div className={`flex rounded-xl p-1 transition-all duration-500 ${
              isDark ? "bg-white/10" : "bg-black/10"
            } backdrop-blur-sm border ${isDark ? "border-white/20" : "border-black/20"}`}>
              <button
                onClick={() => setMode("ephemeral")}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  mode === "ephemeral"
                    ? isDark
                      ? "bg-[#2ecc71]/30 text-[#2ecc71] shadow-lg shadow-[#2ecc71]/20"
                      : "bg-[#54ad95]/20 text-[#00171c] shadow-lg shadow-[#54ad95]/10"
                    : isDark
                      ? "text-[#f0f8ff] hover:text-white hover:bg-[#444444]"
                      : "text-[#00171c]/70 hover:text-[#00171c] hover:bg-[#54ad95]/10"
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
                }}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  mode === "structured"
                    ? isDark
                      ? "bg-[#03a9f4]/30 text-[#03a9f4] shadow-lg shadow-[#03a9f4]/20"
                      : "bg-[#54ad95]/20 text-[#54ad95] shadow-lg shadow-[#54ad95]/10"
                    : isDark
                      ? "text-[#f0f8ff] hover:text-white hover:bg-[#444444]"
                      : "text-[#00171c]/70 hover:text-[#00171c] hover:bg-[#54ad95]/10"
                }`}
              >
                🌿 Structured
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => {
                const newTheme = !isDark;
                setIsDark(newTheme);
                
                // Theme change is always applied for current session
                // but only saved if user has consented
                if (hasConsented) {
                  console.log("Saving theme preference:", newTheme);
                }
              }}
              className={`p-3 rounded-xl transition-all duration-500 ${
                isDark
                  ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#2ecc71]"
                  : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#54ad95]"
              } backdrop-blur-sm border ${
                isDark ? "border-[#2ecc71]/30" : "border-[#54ad95]/30"
              } hover:scale-105 active:scale-95`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <select
              value={selectedModel}
              onChange={(e) => {
                const newModel = e.target.value;
                // Instead of immediately changing the model, store it as pending and show confirmation
                setPendingModelSelection(newModel);
                setShowModelSwitchModal(true);
              }}
              className={`px-4 py-2.5 text-sm rounded-xl transition-all duration-500 ${
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

            <div className="flex flex-col">
              <button
                onClick={verifyAttestation}
                disabled={isVerifying}
                className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-500 ${
                  isDark
                    ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                    : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
                } backdrop-blur-sm border disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg ${
                  isDark ? "shadow-[#2ecc71]/20" : "shadow-[#54ad95]/10"
                }`}
              >
                {isVerifying ? "Verifying..." : attestation ? "✓ Verified" : "Verify Privacy"}
              </button>
              {attestation && attestation.signing_address && (
                <div className={`text-xs mt-1 text-center truncate max-w-[180px] ${
                  isDark ? "text-[#2ecc71]/70" : "text-[#54ad95]/70"
                }`} title={attestation.signing_address}>
                  {attestation.signing_address.substring(0, 10)}...{attestation.signing_address.substring(attestation.signing_address.length - 6)}
                </div>
              )}
            </div>
            {apiKey || openRouterApiKey ? (
              <button
                onClick={handleLogout}
                className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-500 ${
                  isDark
                    ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-[#54ad95]/30"
                    : "bg-red-500/20 hover:bg-red-500/30 text-red-700 border-[#0088fb]/30"
                } backdrop-blur-sm border hover:scale-105 active:scale-95`}
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setShowApiKeyModal(true)}
                className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-500 ${
                  isDark
                    ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                    : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
                } backdrop-blur-sm border hover:scale-105 active:scale-95`}
              >
                Login with API Key
              </button>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Wallet Connect Button - Mobile */}
            <div className="ml-8">
              <CompactAuthButton
                isDark={isDark}
              />
            </div>
            
            {/* Sync Buttons - Mobile */}
            <div className="flex items-center gap-1">
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
            
            {/* Mobile model selector */}
            <select
              value={selectedModel}
              onChange={(e) => {
                const newModel = e.target.value;
                setPendingModelSelection(newModel);
                setShowModelSwitchModal(true);
              }}
              className={`px-2 py-2 text-xs rounded-lg transition-all duration-500 max-w-[120px] ${
                isDark ? "bg-[#333333]/60 border-[#2ecc71]/30 text-[#f0f8ff]" : "bg-[#f0f8ff]/60 border-[#54ad95]/30 text-[#00171c]"
              } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                isDark ? "focus:ring-[#2ecc71]/50" : "focus:ring-[#54ad95]/50"
              }`}
            >
              {ConversationStore.getAvailableModels().map((model) => (
                <option key={model.id} value={model.id} className={isDark ? "bg-gray-800" : "bg-white"}>
                  {model.name.length > 15 ? model.name.substring(0, 12) + '...' : model.name}
                </option>
              ))}
            </select>
            
            {/* Mobile theme toggle */}
            <button
              onClick={() => {
                const newTheme = !isDark;
                setIsDark(newTheme);
                
                // Theme change is always applied for current session
                // but only saved if user has consented
                if (hasConsented) {
                  console.log("Saving theme preference (mobile):", newTheme);
                }
              }}
              className={`p-2 rounded-xl transition-all duration-500 ${
                isDark ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#2ecc71]" : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#54ad95]"
              } backdrop-blur-sm border ${isDark ? "border-[#2ecc71]/30" : "border-[#54ad95]/30"}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}