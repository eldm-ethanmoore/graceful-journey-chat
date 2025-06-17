import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { BranchPanel } from "./BranchPanel"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message as StoredMessage } from "./conversationStore"
import { Sun, Moon, Sparkles, Key, X, Menu, Send, Plus, Camera, GitBranch, ChevronDown, ChevronUp, Settings as SettingsIcon, Eye, QrCode } from "lucide-react"
import { RainbowAuthUI } from "./components/RainbowAuthUI"
import { LiquidGlassWrapper } from "./components/LiquidGlassWrapper"
import { secureStorage, DEFAULT_SETTINGS } from "./utils/secureStorage"
import type { AppSettings } from "./utils/secureStorage"
import { ContextPreview } from "./ContextPreview"
import { ModelSwitchConfirmModal } from "./ModelSwitchConfirmModal"
import { QRCodeSyncManager } from './sync/QRCodeSyncManager';
import { SimpleQRCodeSyncUI } from './components/SimpleQRCodeSyncUI';

interface Message extends StoredMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  attestation?: AttestationData
}

interface AttestationData {
  signing_address: string
  nvidia_payload: string
  intel_quote: string
  verified: boolean
}

const ApiKeyModal = ({ isOpen, onClose, onSave, isDark }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (key: string) => void, 
  isDark: boolean 
}) => {
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      setError('Please enter your RedPill API key')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const testResponse = await fetch('https://api.redpill.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!testResponse.ok) {
        throw new Error('Invalid API key')
      }

      onSave(apiKey)
      onClose()
    } catch (err) {
      setError('Failed to verify API key. Please check your key and try again.')
      console.error('API key verification failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl transition-all duration-300 ${
          isDark ? 'bg-[#333333] text-white' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Enter API Key</h2>
          <button 
            onClick={onClose}
            className={`p-1 rounded-full ${isDark ? 'hover:bg-[#444444]' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={`w-full px-4 py-3 rounded-lg border text-base ${
                isDark
                  ? 'bg-[#444444] border-[#555555] text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-400">{error}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                isDark
                  ? 'bg-[#444444] hover:bg-[#555555] text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 ${
                isLoading ? 'opacity-70' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Save API Key
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MobileBranchPanel = ({
  currentBranch,
  onBranchSelect,
  onCreateBranch,
  messages,
  isDark,
  isOpen,
  onClose,
  setShowMobileMenu,
  handleNewConversation,
  setIsDark
}: {
  currentBranch: Branch | null
  onBranchSelect: (branch: Branch) => void
  onCreateBranch: (name: string) => void
  messages: Message[]
  isDark: boolean
  isOpen: boolean
  onClose: () => void
  setShowMobileMenu: (show: boolean) => void
  handleNewConversation: () => void
  setIsDark: (isDark: boolean) => void
}) => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadBranches()
    }
  }, [isOpen])

  const loadBranches = async () => {
    const allBranches = await ConversationStore.getAllBranches()
    setBranches(allBranches)
  }

  const handleCreateBranch = async () => {
    if (newBranchName.trim()) {
      await onCreateBranch(newBranchName)
      setNewBranchName("")
      setShowNewBranchDialog(false)
      loadBranches()
    }
  }

  const handleSnapshot = async () => {
    if (currentBranch) {
      const description = prompt("Snapshot description (optional):")
      await ConversationStore.createSnapshot(currentBranch.id, messages, description || undefined)
      alert("Snapshot saved!")
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-20 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div className={`fixed inset-y-0 left-0 z-40 w-full max-w-sm transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isDark ? 'bg-[#1a1d23]/95' : 'bg-[#f7f8f9]/95'} backdrop-blur-xl border-r ${
        isDark ? 'border-[#2ecc71]/30' : 'border-[#54ad95]/30'
      }`}>
        
        {/* Header with Back Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`p-2 rounded-lg flex items-center gap-1 ${isDark ? 'hover:bg-[#2ecc71]/20 text-[#2ecc71]' : 'hover:bg-[#0088fb]/20 text-[#0088fb]'}`}
              aria-label="Back to chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="text-sm">Back</span>
            </button>
          </div>
          <h3 className={`font-bold ${isDark ? "text-[#f0f8ff]" : "text-[#1a1d23]"}`}>
            Branches
          </h3>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* Current Branch Info */}
          {currentBranch && (
            <div className={`p-4 rounded-xl ${
              isDark ? "bg-[#2ecc71]/20 border-[#2ecc71]/30 text-[#2ecc71]" : "bg-[#0088fb]/10 border-[#0088fb]/20 text-[#0088fb]"
            } backdrop-blur-sm border`}>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4" />
                <p className="font-semibold text-sm">{currentBranch.name}</p>
              </div>
              <p className={`text-xs ${isDark ? "text-[#f0f8ff]/70" : "text-[#1a1d23]/70"}`}>
                {messages.length} messages
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setShowNewBranchDialog(true)}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                isDark
                  ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                  : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
              } backdrop-blur-sm border flex items-center justify-center gap-2 text-sm`}
            >
              <Plus className="w-4 h-4" />
              New Branch
            </button>

            <button
              onClick={handleSnapshot}
              disabled={!currentBranch}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                isDark
                  ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/20"
                  : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#1a1d23] border-[#54ad95]/20"
              } backdrop-blur-sm border disabled:opacity-50 flex items-center justify-center gap-2 text-sm`}
            >
              <Camera className="w-4 h-4" />
              Save Snapshot
            </button>
          </div>

          {/* Branch List */}
          <div className="space-y-3">
            {branches.map((branch) => (
              <div
                key={branch.id}
                onClick={() => {
                  onBranchSelect(branch)
                  onClose()
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  currentBranch?.id === branch.id
                    ? isDark
                      ? "bg-[#2ecc71]/30 border-[#2ecc71]/50"
                      : "bg-[#54ad95]/20 border-[#54ad95]/40"
                    : isDark
                      ? "bg-[#333333]/60 hover:bg-[#444444]/80 border-[#2ecc71]/20"
                      : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 border-[#54ad95]/20"
                } backdrop-blur-sm border`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium text-sm ${isDark ? "text-[#f0f8ff]" : "text-[#1a1d23]"}`}>
                    {branch.name}
                  </span>
                  {branch.parentId && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isDark ? "bg-[#2ecc71]/20 text-[#2ecc71]" : "bg-[#54ad95]/10 text-[#54ad95]"
                    }`}>
                      forked
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isDark ? "text-[#f0f8ff]/70" : "text-[#1a1d23]/70"}`}>
                  {branch.messages.length} msgs • {branch.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Header Menu Items - Only show on mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/20 lg:hidden">
          <button
            onClick={() => {
              setShowMobileMenu(true);
              onClose();
            }}
            className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 ${
              isDark ? 'bg-[#333333]/60 text-[#f0f8ff]' : 'bg-[#f0f8ff]/60 text-[#1a1d23]'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-sm font-medium">Open Menu</span>
          </button>
        </div>

        {/* New Branch Dialog */}
        {showNewBranchDialog && (
          <div className="fixed inset-0 bg-[#1a1d23]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`p-6 rounded-2xl w-full max-w-sm ${
              isDark ? "bg-[#1a1d23]/95 border-[#2ecc71]/30" : "bg-[#f7f8f9]/95 border-[#0088fb]/30"
            } backdrop-blur-xl border shadow-2xl`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-[#f0f8ff]" : "text-[#1a1d23]"}`}>
                Create New Branch
              </h3>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateBranch()}
                placeholder="Branch name..."
                className={`w-full px-4 py-3 rounded-xl text-base ${
                  isDark
                    ? "bg-[#333333]/60 border-[#2ecc71]/30 text-[#f0f8ff] placeholder-[#f0f8ff]/50"
                    : "bg-[#f0f8ff]/60 border-[#0088fb]/30 text-[#1a1d23] placeholder-[#1a1d23]/50"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-[#2ecc71]/50" : "focus:ring-[#0088fb]/50"
                } mb-4`}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateBranch}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm ${
                    isDark
                      ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                      : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
                  } backdrop-blur-sm border`}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewBranchDialog(false)}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm ${
                    isDark
                      ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/20"
                      : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#1a1d23] border-[#54ad95]/20"
                  } backdrop-blur-sm border`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Consent Banner Component
const ConsentBanner = ({
  isDark,
  onAccept,
  onDecline
}: {
  isDark: boolean,
  onAccept: () => void,
  onDecline: () => void
}) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-500 ${
      isDark ? "bg-[#1a1d23]/90 border-t border-[#2ecc71]/30" : "bg-[#f0f8ff]/90 border-t border-[#54ad95]/30"
    } backdrop-blur-xl`}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
          We use localStorage to save your preferences (theme, model selection, and settings).
          This data stays on your device and helps provide a personalized experience.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
            } backdrop-blur-sm border`}
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/20"
                : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#1a1d23] border-[#54ad95]/20"
            } backdrop-blur-sm border`}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attestation, setAttestation] = useState<AttestationData | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [mode, setMode] = useState<"ephemeral" | "structured">("ephemeral")
  const [isDark, setIsDark] = useState(true)
  const [isInResponseMode, setIsInResponseMode] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showBranchPanel, setShowBranchPanel] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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
  const [qrCodeSyncManager] = useState(() => new QRCodeSyncManager(ConversationStore));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQRCodeSyncAvailable, setIsQRCodeSyncAvailable] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_SETTINGS.maxTokens)
  const [enableTimestamps, setEnableTimestamps] = useState(DEFAULT_SETTINGS.enableTimestamps)
  const [showTimestamps, setShowTimestamps] = useState(DEFAULT_SETTINGS.showTimestamps)
  const [hasConsented, setHasConsented] = useState<boolean | null>(DEFAULT_SETTINGS.hasConsented)

  // RedPill API configuration
  const REDPILL_API_URL = "https://api.redpill.ai/v1"
  const DEFAULT_MODEL = "phala/llama-3.3-70b-instruct"

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
    const savedApiKey = secureStorage.get('redpill_api_key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    } else {
      setShowApiKeyModal(true)
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
      hasConsented
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
  }, [temperature, maxTokens, enableTimestamps, showTimestamps, isDark, selectedModel, hasConsented])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isInResponseMode) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input, isInResponseMode])
  
  // QR Code Sync event listeners
  useEffect(() => {
    // Check if QR Code Sync is available
    setIsQRCodeSyncAvailable(qrCodeSyncManager.isAvailable());
    
    const handleSendStarted = () => setIsSyncing(true);
    const handleSendCompleted = () => {
      setIsSyncing(false);
      setSyncError(null);
    };
    const handleReceiveStarted = () => setIsSyncing(true);
    const handleReceiveCompleted = () => {
      setIsSyncing(false);
      setSyncError(null);
    };
    const handleSendError = (error: Error) => {
      setSyncError(error.message);
      setIsSyncing(false);
    };
    const handleReceiveError = (error: Error) => {
      setSyncError(error.message);
      setIsSyncing(false);
    };

    qrCodeSyncManager.on('send-started', handleSendStarted);
    qrCodeSyncManager.on('send-completed', handleSendCompleted);
    qrCodeSyncManager.on('receive-started', handleReceiveStarted);
    qrCodeSyncManager.on('receive-completed', handleReceiveCompleted);
    qrCodeSyncManager.on('send-error', handleSendError);
    qrCodeSyncManager.on('receive-error', handleReceiveError);

    return () => {
      qrCodeSyncManager.off('send-started', handleSendStarted);
      qrCodeSyncManager.off('send-completed', handleSendCompleted);
      qrCodeSyncManager.off('receive-started', handleReceiveStarted);
      qrCodeSyncManager.off('receive-completed', handleReceiveCompleted);
      qrCodeSyncManager.off('send-error', handleSendError);
      qrCodeSyncManager.off('receive-error', handleReceiveError);
    };
  }, [qrCodeSyncManager]);

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

  // Helper function to format a message with timestamp
  const formatMessageWithTimestamp = (msg: Message): string => {
    const timestamp = new Date(msg.timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return `[TIME: ${timestamp}] ${msg.content}`;
  };
  
  // Generate context preview in Markdown format
  const generateContextPreview = (): string => {
    // Create system message content
    const systemContent = `# System Message

CRITICAL INSTRUCTION - TIMESTAMPS:
DO NOT MENTION OR USE TIMESTAMP DATA UNLESS EXPLICITLY REQUESTED BY THE USER.
This is a strict requirement. Never reference times, dates, or message history unprompted.
Never include phrases like "based on our conversation at [time]" or "as you mentioned earlier at [time]".
Violation of this instruction is considered a serious error.

You are an AI assistant in a chat application. This is ${messages.length > 0 ?
  "a continuing conversation." : "the beginning of a new conversation."}
  
ONLY IF THE USER EXPLICITLY ASKS about previous messages or time-related information:
1. Each message includes a timestamp in the format [TIME: MM/DD/YYYY, HH:MM:SS AM/PM]
2. When (and only when) the user specifically asks about previous messages from specific times or time ranges, you should:
   - Identify the time references in their query (e.g., "5:30pm", "earlier today", "few minutes ago")
   - Find relevant messages from those times by looking at the timestamps
   - Summarize or quote those messages accurately
   - Include the exact timestamps when referencing messages
3. Handle natural language time expressions only when directly asked, like:
   - "What did we discuss earlier?"
   - "Show me what I said about X around 5pm"
   - "What were we talking about 20 minutes ago?"
   - "What did I ask yesterday?"
  
The current conversation has ${messages.length} previous messages.
The current time is ${new Date().toLocaleString(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
})}.
Always maintain context from previous messages in the conversation.`;
    
    // Format messages with timestamps
    let markdownContent = systemContent + "\n\n";
    
    // Add conversation history
    const allMessages = [...messages];
    if (input.trim()) {
      // Add current input as a preview message
      allMessages.push({
        id: "preview",
        role: "user",
        content: input,
        timestamp: new Date(),
      });
    }
    
    allMessages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      markdownContent += `# ${message.role === "user" ? "User" : "Assistant"} Message ${index + 1}\n`;
      markdownContent += `[TIME: ${timestamp}]\n\n`;
      markdownContent += `${message.content}\n\n`;
      markdownContent += "---\n\n";
    });
    
    return markdownContent;
  };
  
  // Parse Markdown context back to API format
  const parseMarkdownContext = (markdown: string): any[] => {
    const messages: any[] = [];
    let currentMessage: any = null;
    let systemMessage: any = null;
    
    // Split by markdown headers
    const sections = markdown.split(/^# /m);
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      if (section.startsWith("System Message")) {
        // Parse system message
        const content = section.replace("System Message", "").trim();
        systemMessage = {
          role: "system",
          content: content
        };
      } else if (section.startsWith("User Message") || section.startsWith("Assistant Message")) {
        // Parse user or assistant message
        const isUser = section.startsWith("User Message");
        const role = isUser ? "user" : "assistant";
        
        // Extract timestamp if present
        const timeMatch = section.match(/\[TIME: (.*?)\]/);
        const timestamp = timeMatch ? timeMatch[1] : null;
        
        // Get content (everything after the timestamp line until the end or ---)
        let content = section;
        if (timestamp) {
          content = content.split(`[TIME: ${timestamp}]`)[1];
        }
        
        // Remove the message number from the first line
        content = content.replace(/^.*Message \d+.*$/m, "").trim();
        
        // Remove trailing separator if present
        content = content.replace(/---\s*$/g, "").trim();
        
        messages.push({
          role: role,
          content: content
        });
      }
    }
    
    // Ensure system message is first
    const result = systemMessage ? [systemMessage, ...messages] : messages;
    return result;
  };

  const sendMessage = async () => {
    console.log("sendMessage called with input:", input)
    
    // Store the current input value to ensure we use it throughout this function
    // This prevents issues with state updates clearing the input before we use it
    const currentInput = input;
    
    // Don't proceed if there's no input, we're already loading, or there's no API key
    if (!currentInput.trim() || isLoading || !apiKey) {
      console.log("Not sending message:", {
        emptyInput: !currentInput.trim(),
        isLoading,
        noApiKey: !apiKey
      })
      if (!apiKey) setShowApiKeyModal(true)
      return
    }
    
    // Log settings state for debugging
    console.log("Current settings:", {
      enableTimestamps,
      showTimestamps,
      temperature,
      maxTokens
    })
    
    // We no longer intercept history queries - let the LLM handle them

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    }

    // Always update messages array immediately to ensure history is preserved
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Clear input and show thinking state
    // Clear input first to prevent "double send" issues
    setInput("");
    
    // Then update UI state
    setCurrentResponse("Thinking...");
    setIsLoading(true);
    setIsInResponseMode(true);
    
    // Save to branch if in structured mode
    if (mode === "structured" && currentBranch) {
      await ConversationStore.updateBranch(currentBranch.id, updatedMessages);
    }
    
    console.log("Updated messages array with user message, now has", updatedMessages.length, "messages");
    
    // Check if there are previous messages to reference
    const hasPreviousMessages = messages.length > 0;

    try {
      let apiMessages;
      
      if (isContextEdited && contextPreviewContent) {
        // Parse the edited markdown context
        try {
          apiMessages = parseMarkdownContext(contextPreviewContent);
          console.log("Using edited context:", apiMessages);
        } catch (error) {
          console.error("Failed to parse edited context:", error);
          setCurrentResponse("Error: Invalid context format. Please check your markdown formatting.");
          setIsLoading(false);
          return;
        }
      } else {
        // Create a more explicit system message about conversation history with time handling instructions
        const systemMessage = {
          role: "system",
          content: `CRITICAL INSTRUCTION - TIMESTAMPS:
DO NOT MENTION OR USE TIMESTAMP DATA UNLESS EXPLICITLY REQUESTED BY THE USER.
This is a strict requirement. Never reference times, dates, or message history unprompted.
Never include phrases like "based on our conversation at [time]" or "as you mentioned earlier at [time]".
Violation of this instruction is considered a serious error.

You are an AI assistant in a chat application. This is ${messages.length > 0 ?
            "a continuing conversation." : "the beginning of a new conversation."}
            
ONLY IF THE USER EXPLICITLY ASKS about previous messages or time-related information:
1. Each message includes a timestamp in the format [TIME: MM/DD/YYYY, HH:MM:SS AM/PM]
2. When (and only when) the user specifically asks about previous messages from specific times or time ranges, you should:
   - Identify the time references in their query (e.g., "5:30pm", "earlier today", "few minutes ago")
   - Find relevant messages from those times by looking at the timestamps
   - Summarize or quote those messages accurately
   - Include the exact timestamps when referencing messages
3. Handle natural language time expressions only when directly asked, like:
   - "What did we discuss earlier?"
   - "Show me what I said about X around 5pm"
   - "What were we talking about 20 minutes ago?"
   - "What did I ask yesterday?"
            
            The current conversation has ${messages.length} previous messages.
            The current time is ${new Date().toLocaleString(undefined, {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })}.
            Always maintain context from previous messages in the conversation.`
        };
        
        // Make sure we're sending ALL previous messages to maintain conversation history
        // Get all messages including the new user message
        const allMessages = [...messages, userMessage];
        console.log("Sending conversation history with", allMessages.length, "messages");
        
        // Format messages for the API with explicit timestamps for all messages
        const timestampedMessages = allMessages.map(m => {
          // For user messages, always add a clear TIME prefix
          if (m.role === "user") {
            // Format timestamp with explicit options to ensure consistent display
            const timestamp = new Date(m.timestamp).toLocaleString(undefined, {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
            
            // Remove any existing timestamp format
            const cleanedContent = m.content.replace(/^\[\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\]\s*/i, '');
            
            // Add the standardized TIME prefix
            const content = `[TIME: ${timestamp}] ${cleanedContent}`;
            console.log("Added standardized timestamp to message:", content);
            
            return {
              role: m.role,
              content: content
            };
          } else {
            // For assistant messages, keep as is
            return {
              role: m.role,
              content: m.content
            };
          }
        });
        
        // Combine system message with the conversation history
        apiMessages = [systemMessage, ...timestampedMessages];
      }
      
      const response = await fetch(`${REDPILL_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: false,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'API request failed')
      }

      const data = await response.json()
      const responseContent = data.choices[0]?.message?.content || 'No response content'

      const assistantMessage: Message = {
        id: data.id || Date.now().toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        attestation: attestation || undefined,
      }

      // Add the assistant's response to the messages array
      const finalMessages = [...messages, assistantMessage];
      
      // Always update the messages array to preserve conversation history
      setMessages(finalMessages);
      console.log("Updated messages array with assistant response, now has", finalMessages.length, "messages");
      
      // Show the response in the UI
      setCurrentResponse(responseContent);

      // Reset context preview state
      setIsContextEdited(false);
      setContextPreviewContent("");
      setShowContextPreview(false);

      if (mode === "structured" && currentBranch) {
        await ConversationStore.updateBranch(currentBranch.id, finalMessages)
      }
    } catch (error: any) {
      console.error("Failed to send message:", error)
      const errorMessage = error.message || "Failed to send message. Please check your API key and connection."
      setCurrentResponse(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleBranchSelect = async (branch: Branch) => {
    setCurrentBranch(branch)
    setMessages(branch.messages)
    setMode("structured")
    returnToInputState()
  }

  const handleCreateBranch = async (name: string) => {
    const newBranch = await ConversationStore.createBranch(name, messages, currentBranch?.id)
    setCurrentBranch(newBranch)
    setMode("structured")
  }

  const handleNewConversation = () => {
    setMessages([])
    setCurrentBranch(null)
    setMode("ephemeral")
    setCurrentResponse("")
    setIsInResponseMode(false)
    setInput("")
    setShowMobileMenu(false)
    // Reset context preview state
    setContextPreviewContent("")
    setIsContextEdited(false)
    setShowContextPreview(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const handlePinConversation = async () => {
    const branch = await ConversationStore.createBranch("New Branch", messages)
    setCurrentBranch(branch)
    setMode("structured")
    // After pinning, stay in the same view but now in structured mode
  }
  
  const handleSaveApiKey = (key: string) => {
    secureStorage.set('redpill_api_key', key)
    setApiKey(key)
    setShowApiKeyModal(false)
  }
  
  const handleLogout = () => {
    secureStorage.remove('redpill_api_key')
    setApiKey(null)
    setShowApiKeyModal(true)
    handleNewConversation()
  }

  // No need for explicit connect/disconnect functions with QR code sync
  // The QRCodeSyncUI component handles these operations internally

  // Handle keyboard events in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Always handle Enter key in the textarea, regardless of mode
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      console.log("Enter key pressed in textarea, isInResponseMode:", isInResponseMode)
      
      // If we're in response mode, return to input mode
      if (isInResponseMode) {
        console.log("Returning to input state from textarea handleKeyDown")
        returnToInputState()
        return
      }
      
      // Otherwise, send the message if there's content
      if (input.trim() && !isLoading) {
        const messageToSend = input; // Store the input before it gets cleared
        console.log("Sending message from handleKeyDown:", messageToSend)
        // We need to call sendMessage() in a setTimeout to ensure React state updates properly
        setTimeout(() => {
          if (messageToSend.trim()) {
            sendMessage();
          }
        }, 0);
      }
    }
  }

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
    <div className={`min-h-screen transition-all duration-1000 ${themeClasses} flex flex-col relative overflow-hidden`}>
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
      {mode === "structured" && (
        <MobileBranchPanel
          currentBranch={currentBranch}
          onBranchSelect={handleBranchSelect}
          onCreateBranch={handleCreateBranch}
          messages={messages}
          isDark={isDark}
          isOpen={showBranchPanel}
          onClose={() => setShowBranchPanel(false)}
          setShowMobileMenu={setShowMobileMenu}
          handleNewConversation={handleNewConversation}
          setIsDark={setIsDark}
        />
      )}

      {/* Header */}
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
                    setShowBranchPanel(!showBranchPanel);
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
              
              <Sparkles className={`w-6 h-6 transition-colors duration-500 ${
                isDark ? "text-[#2ecc71]" : "text-[#0088fb]"
              }`} />
              <h1 className={`text-lg lg:text-2xl font-bold transition-colors duration-500 ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Graceful Journey Chat
              </h1>
            </div>

            {/* Right side - Desktop controls */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Settings Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors duration-300 ${
                    isDark
                      ? "bg-[#03a9f4]/20 hover:bg-[#03a9f4]/30 text-[#03a9f4]"
                      : "bg-[#0088fb]/10 hover:bg-[#0088fb]/20 text-[#0088fb]"
                  } flex items-center gap-1`}
                  title="Settings & QR Code Sync"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
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
                {TEE_MODELS.map((model) => (
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
              {apiKey ? (
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
              } backdrop-blur-sm border ${isDark ? "border-[#2ecc71]/30" : "border-[#54ad95]/30"} lg:hidden`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Only visible on mobile */}
      {showMobileMenu && (
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
                  Settings & QR Code Sync
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
                {TEE_MODELS.map((model) => (
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

              {apiKey ? (
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
      )}

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col px-4 py-4 lg:py-8 max-w-4xl mx-auto w-full relative z-10"
        onClick={() => {
          if (showBranchPanel) {
            setShowBranchPanel(false);
          }
        }}
      >
        {/* Settings Dropdown */}
        <div className="mb-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/30"
                : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#00171c] border-[#54ad95]/30"
            } backdrop-blur-sm border text-sm font-medium`}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings & QR Code Sync
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showSettings && (
            <LiquidGlassWrapper
              className="settings-panel mt-2 p-4 rounded-xl"
              isDark={isDark}
            >
              {/* Authentication UI */}
              {showAuthUI && (
                <div className="mb-4">
                  <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    Optional Wallet Authentication
                  </h3>
                  <p className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Connect your wallet for additional features. This is optional and not required to use the app.
                  </p>
                  <RainbowAuthUI
                    isDark={isDark}
                    authServerUrl="https://0bjtaos0w3.execute-api.us-east-1.amazonaws.com/verify"
                    onAuthChange={(isAuthenticated) => {
                      console.log("Auth state changed:", isAuthenticated);
                    }}
                  />
                </div>
              )}
              
              {/* QR Code Sync UI */}
              <div className="mb-4">
                <h3 className={`text-sm font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                  QR Code Synchronization
                </h3>
                <SimpleQRCodeSyncUI
                  isDark={isDark}
                  conversationStore={ConversationStore}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              {/* No toggle buttons as requested */}
            </LiquidGlassWrapper>
          )}
        </div>
        
        {/* One Bubble Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <LiquidGlassWrapper
            className="chat-box rounded-2xl p-4 lg:p-6 overflow-hidden flex flex-col min-h-0 w-full h-full"
            isDark={isDark}
          >
          
          {isInResponseMode ? (
            <div
              className="flex-1 overflow-y-auto flex items-center justify-center min-h-0"
              tabIndex={0} // Make div focusable
              onKeyDown={(e) => { // Add keyboard handler directly to response div
                if (e.key === 'Enter' && !e.shiftKey) {
                  console.log("Enter key pressed in response div");
                  returnToInputState();
                }
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              ) : (
                <div
                  className="w-full"
                  onClick={() => {
                    // Add click handler to entire response area
                    // Double-click anywhere on the response to return to input mode
                    console.log("Response area clicked");
                  }}
                  onDoubleClick={() => {
                    console.log("Response area double-clicked");
                    returnToInputState();
                  }}
                >
                  <div className={`prose prose-sm lg:prose-lg max-w-none w-full ${isDark ? 'text-white' : 'text-gray-900'} overflow-y-auto max-h-[60vh]`}>
                    {enableTimestamps && showTimestamps && messages.length > 0 && messages[messages.length - 1].timestamp && (
                      <div className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(messages[messages.length - 1].timestamp).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Explicitly use local time zone
                          timeZoneName: 'short'
                        })}
                      </div>
                    )}
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }: any) => <p className="mb-4 lg:mb-6 last:mb-0 text-base lg:text-xl leading-relaxed" {...props} />,
                        ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-4 lg:mb-6 last:mb-0 text-base lg:text-xl" {...props} />,
                        ol: ({ node, ...props }: any) => (
                          <ol className="list-decimal pl-6 mb-4 lg:mb-6 last:mb-0 text-base lg:text-xl" {...props} />
                        ),
                        li: ({ node, ...props }: any) => <li className="mb-2 text-base lg:text-xl" {...props} />,
                        a: ({ node, ...props }: any) => (
                          <a
                            className={`transition-colors duration-300 hover:underline ${
                              isDark ? "text-[#03a9f4]" : "text-[#54ad95]"
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        code: ({ node, inline, className, children, ...props }: any) =>
                          inline ? (
                            <code
                              className={`px-2 py-1 rounded text-sm transition-colors duration-500 ${
                                isDark ? "bg-[#333333]/80" : "bg-[#f0f8ff]/80"
                              }`}
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <pre
                              className={`p-4 rounded-lg my-3 overflow-x-auto transition-colors duration-500 ${
                                isDark ? "bg-[#333333]/80" : "bg-[#f0f8ff]/80"
                              }`}
                            >
                              <code className="text-sm" {...props}>
                                {children}
                              </code>
                            </pre>
                          ),
                      }}
                    >
                      {currentResponse}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Response Actions */}
                  <div className="mt-4 lg:mt-6 pt-4 border-t border-gray-500/20 flex flex-col sm:flex-row justify-center gap-3">
                    <button
                      onClick={() => {
                        console.log("New Message button clicked");
                        returnToInputState();
                        // Force focus on textarea after a delay
                        setTimeout(() => {
                          const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            textarea.focus();
                            console.log("Textarea focused via getElementById");
                          }
                        }, 150);
                      }}
                      className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                        isDark
                          ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71]"
                          : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95]"
                      } backdrop-blur-sm hover:scale-105 active:scale-95 flex-1 sm:flex-none`}
                    >
                      New Message (or press Enter)
                    </button>
                    {messages.length > 0 && mode === "ephemeral" && (
                      <button
                        onClick={handlePinConversation}
                        className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                          isDark
                            ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4]"
                            : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95]"
                        } backdrop-blur-sm hover:scale-105 active:scale-95 flex-1 sm:flex-none`}
                      >
                        📌 Save
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Input Mode */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-2xl">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={messages.length === 0 ? "Start a private conversation..." : "Continue the conversation..."}
                      className={`w-full resize-none outline-none transition-all duration-500 ${
                        isDark
                          ? "bg-transparent text-white placeholder-gray-400"
                          : "bg-transparent text-gray-900 placeholder-gray-600"
                      } text-base lg:text-lg leading-relaxed pr-12 lg:pr-20`}
                      style={{ minHeight: '60px', maxHeight: '120px' }}
                      rows={1}
                      autoFocus
                      id="chat-input-textarea"
                    />
                    
                    {/* Send Button - Mobile floating */}
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !input.trim()}
                      className={`absolute bottom-2 right-2 p-2 lg:p-3 rounded-full transition-all duration-300 ${
                        isDark
                          ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                          : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
                      } backdrop-blur-sm border disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 lg:rounded-lg lg:px-4 lg:py-2`}
                    >
                      <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span className="hidden lg:inline ml-2 text-sm font-medium">Send</span>
                    </button>
                  </div>
                  
                  {/* Input hints */}
                  <div className="flex items-center justify-between mt-3 text-xs lg:text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`${isDark ? 'text-gray-300' : 'text-gray-400'}`}>
                        ⏎ to send • ⇧⏎ for new line
                      </span>
                      <button
                        onClick={() => {
                          // Generate context preview content if not already edited
                          if (!isContextEdited) {
                            const previewContent = generateContextPreview();
                            setContextPreviewContent(previewContent);
                          }
                          setShowContextPreview(!showContextPreview);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-all duration-300 flex items-center gap-1 ${
                          isDark
                            ? `${showContextPreview ? "bg-[#2ecc71]/30" : "bg-[#333333]/60"} hover:bg-[#444444]/80 text-[#f0f8ff]`
                            : `${showContextPreview ? "bg-[#54ad95]/20" : "bg-[#f0f8ff]/60"} hover:bg-[#f0f8ff]/80 text-[#00171c]`
                        } backdrop-blur-sm hover:scale-105 active:scale-95`}
                      >
                        <Eye className="w-3 h-3" />
                        {showContextPreview ? "Hide Context" : "Show Context"}
                      </button>
                    </div>
                    {messages.length > 0 && (
                      <button
                        onClick={handleNewConversation}
                        className={`px-2 py-1 text-xs rounded transition-all duration-300 ${
                          isDark
                            ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff]"
                            : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#00171c]"
                        } backdrop-blur-sm hover:scale-105 active:scale-95`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Context Preview */}
                  <ContextPreview
                    isOpen={showContextPreview}
                    content={contextPreviewContent}
                    isDark={isDark}
                    onContentChange={(content) => {
                      setContextPreviewContent(content);
                      setIsContextEdited(true);
                    }}
                    onClose={() => setShowContextPreview(false)}
                    onReset={() => {
                      const previewContent = generateContextPreview();
                      setContextPreviewContent(previewContent);
                      setIsContextEdited(false);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          </LiquidGlassWrapper>
        </div>

        {/* Status bar */}
        <div className={`text-center mt-4 text-xs lg:text-sm ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          🔒 {mode === "ephemeral" 
            ? "Ephemeral session • No history stored" 
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
        onSave={handleSaveApiKey}
        isDark={isDark}
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
          TEE_MODELS.find(model => model.id === pendingModelSelection)?.name || pendingModelSelection :
          ""}
      />
    </div>
  )
}

export default App