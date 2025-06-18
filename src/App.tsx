import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { BranchPanel } from "./BranchPanel"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message as StoredMessage } from "./conversationStore"
import { Sun, Moon, Key, X, Menu, Send, Plus, Camera, GitBranch, ChevronDown, ChevronUp, Settings as SettingsIcon, Eye, Paperclip, Download } from "lucide-react"
import { RainbowAuthUI } from "./components/RainbowAuthUI"
import { CompactAuthButton } from "./components/CompactAuthButton"
import { SendDataButton } from "./components/SendDataButton"
import { ReceiveDataButton } from "./components/ReceiveDataButton"
import { LiquidGlassWrapper } from "./components/LiquidGlassWrapper"
import { ApiKeyModal } from "./components/ApiKeyModal"
import { MobileBranchPanel } from "./components/MobileBranchPanel"
import { ConsentBanner } from "./components/ConsentBanner"
import { SettingsPanel } from "./components/SettingsPanel"
import { MobileMenu } from "./components/MobileMenu"
import { HeaderSection } from "./components/HeaderSection"
import { ChatInterface } from "./components/ChatInterface"
import { secureStorage, DEFAULT_SETTINGS } from "./utils/secureStorage"
import type { AppSettings } from "./utils/secureStorage"
import { generateContextPreview, parseMarkdownContext } from "./utils/contextUtils"
import { sendMessage as sendMessageUtil } from "./utils/messagingUtils"
import * as handlers from "./utils/appHandlers"
import { ContextPreview } from "./ContextPreview"
import { ModelSwitchConfirmModal } from "./ModelSwitchConfirmModal"
import { PipingSyncManager } from './sync/PipingSyncManager';
import { PipingSyncUI } from './components/PipingSyncUI';
import gjPalmLight from "./assets/gj-palm-light-mode.png"
import gjPalmDark from "./assets/gj-palm-dark-mode.png"

interface Message extends StoredMessage {
  id: string
  role: "user" | "assistant"
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>
  timestamp: Date
  attestation?: AttestationData
}

interface AttestationData {
  signing_address: string
  nvidia_payload: string
  intel_quote: string
  verified: boolean
}




function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [attestation, setAttestation] = useState<AttestationData | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [mode, setMode] = useState<"ephemeral" | "structured">("ephemeral")
  const [isDark, setIsDark] = useState(true)
  const [isInResponseMode, setIsInResponseMode] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string | null>(null);
  const [showBranchPanel, setShowBranchPanel] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSyncWarning, setShowSyncWarning] = useState(false)
  const [syncWarningAcknowledged, setSyncWarningAcknowledged] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null);
  
  // Context preview state
  const [showContextPreview, setShowContextPreview] = useState(false)
  const [contextPreviewContent, setContextPreviewContent] = useState("")
  const [isContextEdited, setIsContextEdited] = useState(false)
  
  // Model switch confirmation state
  const [showModelSwitchModal, setShowModelSwitchModal] = useState(false)
  const [pendingModelSelection, setPendingModelSelection] = useState<string | null>(null)
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  // Always show these features - no toggles
  const showAuthUI = true
  const [temperature, setTemperature] = useState(DEFAULT_SETTINGS.temperature)
  const [pipingSyncManager] = useState(() => new PipingSyncManager(ConversationStore));
  const [isSending, setIsSending] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isPipingSyncAvailable, setIsPipingSyncAvailable] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingSendAction, setPendingSendAction] = useState(false);
  const [pendingReceiveAction, setPendingReceiveAction] = useState<string | null>(null);
  
  // Reset acknowledgment when syncing stops
  useEffect(() => {
    if (!isSending && !isReceiving) {
      setSyncWarningAcknowledged(false);
    }
  }, [isSending, isReceiving]);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_SETTINGS.maxTokens)
  const [enableTimestamps, setEnableTimestamps] = useState(DEFAULT_SETTINGS.enableTimestamps)
  const [showTimestamps, setShowTimestamps] = useState(DEFAULT_SETTINGS.showTimestamps)
  const [hasConsented, setHasConsented] = useState<boolean | null>(DEFAULT_SETTINGS.hasConsented)
  const [exportWithSystemPrompt, setExportWithSystemPrompt] = useState(DEFAULT_SETTINGS.exportWithSystemPrompt)

  // RedPill API configuration
  const REDPILL_API_URL = "https://api.redpill.ai/v1"
  const DEFAULT_MODEL = "openai/gpt-4o"
  const OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

  const TEE_MODELS = [
    { id: "phala/llama-3.3-70b-instruct", name: "Llama 3.3 70B", description: "Fast & multilingual" },
    { id: "phala/deepseek-r1-70b", name: "DeepSeek R1 70B", description: "Advanced reasoning" },
    { id: "phala/qwen-2.5-7b-instruct", name: "Qwen 2.5 7B", description: "Efficient & capable" },
  ]

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)

  useEffect(() => {
    loadOrCreateDefaultBranch()
  }, [])

  // Load API key on mount
  useEffect(() => {
    const savedApiKey = secureStorage.get('redpill_api_key');
    const savedOpenRouterKey = secureStorage.get('openrouter_api_key');

    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedOpenRouterKey) {
      setOpenRouterApiKey(savedOpenRouterKey);
    }

    if (!savedApiKey && !savedOpenRouterKey) {
      setShowApiKeyModal(true);
    }
    
    // Load saved settings
    const savedSettings = secureStorage.loadSettings()
    setTemperature(savedSettings.temperature)
    setMaxTokens(savedSettings.maxTokens)
    setEnableTimestamps(savedSettings.enableTimestamps)
    setShowTimestamps(savedSettings.showTimestamps)
    
    // Load theme and model preferences if they exist
    if (savedSettings.isDark !== undefined) {
      setIsDark(savedSettings.isDark)
    }
    
    if (savedSettings.selectedModel) {
      setSelectedModel(savedSettings.selectedModel)
    }
    
    // Load consent status
    setHasConsented(savedSettings.hasConsented)
  }, [])
  
  // Save settings when they change
  useEffect(() => {
    const currentSettings: AppSettings = {
      temperature,
      maxTokens,
      enableTimestamps,
      showTimestamps,
      isDark,
      selectedModel,
      hasConsented,
      exportWithSystemPrompt
    }
    
    // Always save the consent decision itself
    if (hasConsented !== null) {
      secureStorage.saveSettings(currentSettings)
    }
    
    // Only save other preferences if user has consented
    if (hasConsented === true) {
      // We've already saved everything in the call above
      console.log("Saved user preferences:", currentSettings)
    } else {
      console.log("User preferences not saved due to consent settings")
    }
  }, [temperature, maxTokens, enableTimestamps, showTimestamps, isDark, selectedModel, hasConsented, exportWithSystemPrompt])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isInResponseMode) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input, isInResponseMode])
  
  // Piping Sync event listeners
  useEffect(() => {
    // Check if Piping Sync is available
    setIsPipingSyncAvailable(pipingSyncManager.isAvailable());
    
    const handleSendStarted = () => setIsSending(true);
    const handleSendCompleted = () => {
      setIsSending(false);
      setSyncError(null);
    };
    const handleReceiveStarted = () => setIsReceiving(true);
    const handleReceiveCompleted = () => {
      setIsReceiving(false);
      setSyncError(null);
    };
    const handleSendError = (error: Error) => {
      setSyncError(error.message);
      setIsSending(false);
    };
    const handleReceiveError = (error: Error) => {
      setSyncError(error.message);
      setIsReceiving(false);
    };

    pipingSyncManager.on('send-started', handleSendStarted);
    pipingSyncManager.on('send-completed', handleSendCompleted);
    pipingSyncManager.on('receive-started', handleReceiveStarted);
    pipingSyncManager.on('receive-completed', handleReceiveCompleted);
    pipingSyncManager.on('send-error', handleSendError);
    pipingSyncManager.on('receive-error', handleReceiveError);

    return () => {
      pipingSyncManager.off('send-started', handleSendStarted);
      pipingSyncManager.off('send-completed', handleSendCompleted);
      pipingSyncManager.off('receive-started', handleReceiveStarted);
      pipingSyncManager.off('receive-completed', handleReceiveCompleted);
      pipingSyncManager.off('send-error', handleSendError);
      pipingSyncManager.off('receive-error', handleReceiveError);
    };
  }, [pipingSyncManager]);

  const loadOrCreateDefaultBranch = async () => {
    const branches = await ConversationStore.getAllBranches()
    if (branches.length === 0) {
      const defaultBranch = await ConversationStore.createBranch("Main", [])
      setCurrentBranch(defaultBranch)
    } else {
      const latestBranch = branches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      setCurrentBranch(latestBranch)
      setMessages(latestBranch.messages)
    }
  }

  const verifyAttestation = async () => {
    if (!apiKey) {
      setShowApiKeyModal(true)
      return
    }
    
    try {
      setIsVerifying(true)
      const response = await fetch(`${REDPILL_API_URL}/attestation/report?model=${selectedModel}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to verify attestation')
      }

      const attestationData = await response.json()
      setAttestation({
        ...attestationData,
        verified: true,
        timestamp: new Date()
      })
    } catch (error) {
      console.error("Failed to verify attestation:", error)
      setAttestation(prev => prev ? { ...prev, verified: false } : null)
    } finally {
      setIsVerifying(false)
    }
  }


  // Wrapper function to match the expected signature for ChatInterface
  const generateContextPreviewWrapper = (): string => {
    return generateContextPreview(messages, input, attachment);
  };

  const sendMessage = async () => {
    const controller = new AbortController();
    setAbortController(controller);
    
    await sendMessageUtil({
      input,
      attachment,
      messages,
      isLoading,
      apiKey,
      openRouterApiKey,
      selectedModel,
      temperature,
      maxTokens,
      attestation,
      mode,
      currentBranch,
      isContextEdited,
      contextPreviewContent,
      setMessages,
      setInput,
      setAttachment,
      setCurrentResponse,
      setIsLoading,
      setIsInResponseMode,
      setIsContextEdited,
      setContextPreviewContent,
      setShowContextPreview,
      setShowApiKeyModal,
      abortController: controller
    });
  }

  const handleCancel = () => handlers.handleCancel(abortController);

  const returnToInputState = () => {
    console.log("Returning to input state")
    
    // Prevent multiple rapid calls
    if (!isInResponseMode) {
      console.log("Already in input state, ignoring call")
      return
    }
    
    // First clear the response
    setCurrentResponse("")
    
    // Then switch mode and clear input
    setIsInResponseMode(false)
    
    // Don't clear input immediately to prevent "eating" messages
    // This allows any pending input to be sent properly
    setTimeout(() => {
      setInput("")
    }, 50)
    
    // Focus the textarea using multiple approaches for reliability
    const focusTextarea = () => {
      console.log("Attempting to focus textarea")
      
      // Try using the ref first
      if (textareaRef.current) {
        textareaRef.current.focus()
        console.log("Textarea focused via ref")
        return true
      }
      
      // Fallback to getElementById
      const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        console.log("Textarea focused via getElementById")
        return true
      }
      
      console.warn("Failed to focus textarea - element not found")
      return false
    }
    
    // Try immediately
    const immediate = focusTextarea()
    
    // If immediate focus failed, try with increasing delays
    if (!immediate) {
      setTimeout(focusTextarea, 50)
      setTimeout(focusTextarea, 150)
      setTimeout(focusTextarea, 300)
    }
  }

  const handleBranchSelect = async (branch: Branch) =>
    handlers.handleBranchSelect(branch, setCurrentBranch, setMessages, setMode, returnToInputState);

  const handleCreateBranch = async (name: string) =>
    handlers.handleCreateBranch(name, messages, currentBranch, setCurrentBranch, setMode);

  const handleNewConversation = () =>
    handlers.handleNewConversation(
      setMessages, setCurrentBranch, setMode, setCurrentResponse, setIsInResponseMode,
      setInput, setShowMobileMenu, setContextPreviewContent, setIsContextEdited,
      setShowContextPreview, textareaRef
    );

  const handlePinConversation = async () =>
    handlers.handlePinConversation(messages, setCurrentBranch, setMode);
  
  const handleSaveApiKeys = (keys: { redpill: string; openrouter: string }) =>
    handlers.handleSaveApiKeys(keys, setApiKey, setOpenRouterApiKey, setShowApiKeyModal);
  
  const handleLogout = () =>
    handlers.handleLogout(setApiKey, setOpenRouterApiKey, setShowApiKeyModal, handleNewConversation);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    handlers.handleFileSelect(e, setAttachment);

  const handleExport = () =>
    handlers.handleExport(messages, exportWithSystemPrompt);

  // No need for explicit connect/disconnect functions with piping sync
  // The PipingSyncUI component handles these operations internally

  // Handle keyboard events in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) =>
    handlers.handleKeyDown(e, isInResponseMode, returnToInputState, input, isLoading, sendMessage);

  // Global keyboard event handler for Enter key in response mode
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key in response mode and when not in a form element
      // This prevents interference with textarea input
      const isInFormElement = e.target instanceof HTMLTextAreaElement ||
                             e.target instanceof HTMLInputElement ||
                             e.target instanceof HTMLSelectElement;
                             
      if (e.key === 'Enter' && !e.shiftKey && isInResponseMode && !isInFormElement) {
        console.log("Enter key pressed globally while in response mode")
        returnToInputState()
      }
    }
    
    // Add global event listener
    window.addEventListener('keydown', handleGlobalKeyDown)
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isInResponseMode]) // Re-add listener when response mode changes

  const themeClasses = isDark
    ? "bg-gradient-to-br from-[#1a1d23] via-[#333333]/30 to-[#1a1d23]"
    : "bg-gradient-to-br from-[#f7f8f9] via-[#f0f8ff]/70 to-[#f7f8f9]"

  return (
    <div className={`min-h-screen transition-all duration-1000 ${themeClasses} flex flex-col justify-center relative overflow-hidden`}>
      {/* Sync Warning Modal */}
      {showSyncWarning && (
        <>
          {/* Full-screen overlay to block interaction */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"></div>
          
          {/* Centered modal */}
          <div className="fixed inset-0 flex items-start justify-center z-50 pt-20">
            <LiquidGlassWrapper
              className="p-5 rounded-xl shadow-lg max-w-sm mx-4"
              isDark={isDark}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className={`text-base font-bold ${isDark ? "text-red-300" : "text-red-600"}`}>
                  ⚠️ SECURITY WARNING
                </h3>
                <button
                  onClick={() => {
                    setShowSyncWarning(false);
                    setPendingSendAction(false);
                    setPendingReceiveAction(null);
                  }}
                  className={`p-1 rounded-full ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className={`text-sm mb-4 ${isDark ? "text-white/90" : "text-black/90"} font-medium`}>
                The sync feature uses ppng.io which is <span className="text-red-500 font-bold">NOT ENCRYPTED</span>.
                Your data will be stored on ppng servers and is <span className="underline">not secure</span>.
                Anyone with the sync code can access your data.
              </p>
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => {
                    setShowSyncWarning(false);
                    setPendingSendAction(false);
                    setPendingReceiveAction(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex-1 ${
                    isDark
                      ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30"
                      : "bg-red-500/20 hover:bg-red-500/30 text-red-600 border-red-500/30"
                  } backdrop-blur-sm border`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSyncWarning(false);
                    setSyncWarningAcknowledged(true);
                    
                    // Execute the pending action
                    if (pendingSendAction) {
                      pipingSyncManager.startSending();
                      setPendingSendAction(false);
                    } else if (pendingReceiveAction) {
                      pipingSyncManager.startReceiving(pendingReceiveAction);
                      setPendingReceiveAction(null);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex-1 ${
                    isDark
                      ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                      : "bg-[#0088fb]/20 hover:bg-[#0088fb]/30 text-[#0088fb] border-[#0088fb]/30"
                  } backdrop-blur-sm border`}
                >
                  Continue
                </button>
              </div>
            </LiquidGlassWrapper>
          </div>
        </>
      )}
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/4 w-64 h-64 lg:w-96 lg:h-96 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
            isDark ? "bg-[#2ecc71]" : "bg-[#54ad95]/70"
          }`}
          style={{ animation: "float 6s ease-in-out infinite" }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-48 h-48 lg:w-80 lg:h-80 rounded-full blur-3xl opacity-15 transition-all duration-1000 ${
            isDark ? "bg-[#03a9f4]" : "bg-[#0088fb]/60"
          }`}
          style={{ animation: "float 8s ease-in-out infinite reverse" }}
        />
        <div
          className={`absolute top-1/2 left-1/2 w-32 h-32 lg:w-64 lg:h-64 rounded-full blur-2xl opacity-10 transition-all duration-1000 ${
            isDark ? "bg-[#9b59b6]/80" : "bg-[#54ad95]/40"
          }`}
          style={{ animation: "float 10s ease-in-out infinite" }}
        />
      </div>

      {/* Branch Panel */}
      <BranchPanel
        currentBranch={currentBranch}
        onBranchSelect={handleBranchSelect}
        onCreateBranch={handleCreateBranch}
        messages={messages}
        isDark={isDark}
        expandedView={showBranchPanel && mode === "structured"}
        onClose={() => setShowBranchPanel(false)}
      />

      {/* Header */}
      <HeaderSection
        isDark={isDark}
        setIsDark={setIsDark}
        hasConsented={hasConsented}
        mode={mode}
        setMode={setMode}
        setShowBranchPanel={setShowBranchPanel}
        setShowMobileMenu={setShowMobileMenu}
        currentBranch={currentBranch}
        messages={messages}
        handlePinConversation={handlePinConversation}
        isSending={isSending}
        isReceiving={isReceiving}
        pipingSyncManager={pipingSyncManager}
        syncWarningAcknowledged={syncWarningAcknowledged}
        setPendingSendAction={setPendingSendAction}
        setShowSyncWarning={setShowSyncWarning}
        setPendingReceiveAction={setPendingReceiveAction}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        setPendingModelSelection={setPendingModelSelection}
        setShowModelSwitchModal={setShowModelSwitchModal}
        verifyAttestation={verifyAttestation}
        isVerifying={isVerifying}
        attestation={attestation}
        apiKey={apiKey}
        openRouterApiKey={openRouterApiKey}
        handleLogout={handleLogout}
        setShowApiKeyModal={setShowApiKeyModal}
      />

      {/* Mobile Menu - Only visible on mobile */}
      <MobileMenu
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        isDark={isDark}
        mode={mode}
        setMode={setMode}
        setShowBranchPanel={setShowBranchPanel}
        setShowSettings={setShowSettings}
        selectedModel={selectedModel}
        setShowModelSwitchModal={setShowModelSwitchModal}
        setPendingModelSelection={setPendingModelSelection}
        verifyAttestation={verifyAttestation}
        isVerifying={isVerifying}
        attestation={attestation}
        handleNewConversation={handleNewConversation}
        apiKey={apiKey}
        openRouterApiKey={openRouterApiKey}
        handleLogout={handleLogout}
        setShowApiKeyModal={setShowApiKeyModal}
        currentBranch={currentBranch}
        messages={messages}
        handlePinConversation={handlePinConversation}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col justify-center px-4 py-4 lg:py-8 max-w-4xl mx-auto w-full relative z-10 transition-all duration-300 ${
          showSettings ? 'transform translate-y-[10%]' : 'transform -translate-y-[15%]'
        }`}
        onClick={() => {
          if (showBranchPanel) {
            setShowBranchPanel(false);
          }
        }}
      >
        {/* Settings Dropdown */}
        <SettingsPanel
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          isDark={isDark}
          setShowApiKeyModal={setShowApiKeyModal}
          apiKey={apiKey}
          openRouterApiKey={openRouterApiKey}
          temperature={temperature}
          setTemperature={setTemperature}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          enableTimestamps={enableTimestamps}
          setEnableTimestamps={setEnableTimestamps}
          showTimestamps={showTimestamps}
          setShowTimestamps={setShowTimestamps}
          hasConsented={hasConsented}
          setHasConsented={setHasConsented}
          exportWithSystemPrompt={exportWithSystemPrompt}
          setExportWithSystemPrompt={setExportWithSystemPrompt}
          handleExport={handleExport}
          messages={messages}
        />
        
        {/* One Bubble Chat Interface */}
        <ChatInterface
          showSettings={showSettings}
          isDark={isDark}
          isInResponseMode={isInResponseMode}
          isLoading={isLoading}
          currentResponse={currentResponse}
          handleCancel={handleCancel}
          returnToInputState={returnToInputState}
          enableTimestamps={enableTimestamps}
          showTimestamps={showTimestamps}
          messages={messages}
          attachment={attachment}
          setAttachment={setAttachment}
          input={input}
          setInput={setInput}
          handleKeyDown={handleKeyDown}
          selectedModel={selectedModel}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          sendMessage={sendMessage}
          showContextPreview={showContextPreview}
          setShowContextPreview={setShowContextPreview}
          contextPreviewContent={contextPreviewContent}
          setContextPreviewContent={setContextPreviewContent}
          isContextEdited={isContextEdited}
          setIsContextEdited={setIsContextEdited}
          generateContextPreview={generateContextPreviewWrapper}
          handleNewConversation={handleNewConversation}
          mode={mode}
          handlePinConversation={handlePinConversation}
        />

        {/* Status bar */}
        <div className={`text-center mt-4 text-xs lg:text-sm ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          🔒 {mode === "ephemeral" 
            ? "Ephemeral session"
            : `Branch: ${currentBranch?.name || "Main"}`}
        </div>
      </div>

      <style jsx>{`
        /* Toggle switch styles */
        .toggle-checkbox:checked {
          right: 0;
          border-color: ${isDark ? '#2ecc71' : '#0088fb'};
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: ${isDark ? '#2ecc71' : '#0088fb'};
        }
        .toggle-checkbox {
          right: 0;
          z-index: 10;
          border-color: ${isDark ? '#00171c' : '#f0f8ff'};
          transition: all 0.3s;
        }
        .toggle-label {
          transition: all 0.3s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        /* Mobile-specific styles */
        @media (max-width: 768px) {
          .prose {
            font-size: 16px;
            line-height: 1.6;
          }
          
          /* Prevent zoom on input focus on iOS */
          input[type="text"], 
          input[type="password"], 
          textarea {
            font-size: 16px;
          }
          
          /* Better touch targets */
          button {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Smooth scrolling */
          * {
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Custom scrollbar for mobile */
        ::-webkit-scrollbar {
          width: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        
        /* Hide scrollbar on mobile but keep functionality */
        @media (max-width: 768px) {
          ::-webkit-scrollbar {
            display: none;
          }
          
          * {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
        }
      `}</style>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleSaveApiKeys}
        isDark={isDark}
        initialRedPillKey={apiKey}
        initialOpenRouterKey={openRouterApiKey}
      />
      
      {/* Consent Banner - only show if consent status is null (not decided) */}
      {hasConsented === null && (
        <ConsentBanner
          isDark={isDark}
          onAccept={() => setHasConsented(true)}
          onDecline={() => setHasConsented(false)}
        />
      )}
      
      {/* Model Switch Confirmation Modal */}
      <ModelSwitchConfirmModal
        isOpen={showModelSwitchModal}
        onClose={() => {
          setShowModelSwitchModal(false);
          // Reset the dropdown to the current selection
          setPendingModelSelection(null);
        }}
        onKeepContext={() => {
          if (pendingModelSelection) {
            // Apply the model change but keep the conversation
            setSelectedModel(pendingModelSelection);
            
            // Save preference if consented
            if (hasConsented) {
              console.log("Saving model preference:", pendingModelSelection);
            }
            
            // Close the modal
            setShowModelSwitchModal(false);
            setPendingModelSelection(null);
          }
        }}
        onResetContext={() => {
          if (pendingModelSelection) {
            // Apply the model change
            setSelectedModel(pendingModelSelection);
            
            // Save preference if consented
            if (hasConsented) {
              console.log("Saving model preference:", pendingModelSelection);
            }
            
            // Reset the conversation
            handleNewConversation();
            
            // Reset context preview content
            setContextPreviewContent("");
            setIsContextEdited(false);
            setShowContextPreview(false);
            
            // Close the modal
            setShowModelSwitchModal(false);
            setPendingModelSelection(null);
          }
        }}
        isDark={isDark}
        newModelName={pendingModelSelection ?
          ConversationStore.getAvailableModels().find(model => model.id === pendingModelSelection)?.name || pendingModelSelection :
          ""}
      />
    </div>
  )
}

export default App