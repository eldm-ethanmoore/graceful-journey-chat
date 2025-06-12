import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { BranchPanel } from "./BranchPanel"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message as StoredMessage } from "./conversationStore"
import { Sun, Moon, Sparkles, Key, X, Menu, Send, Plus, Camera, GitBranch } from "lucide-react"
import { secureStorage } from "./utils/secureStorage"

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
          isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Enter API Key</h2>
          <button 
            onClick={onClose}
            className={`p-1 rounded-full ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
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
                  ? 'bg-gray-700 border-gray-600 text-white' 
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
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
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
  onClose
}: {
  currentBranch: Branch | null
  onBranchSelect: (branch: Branch) => void
  onCreateBranch: (name: string) => void
  messages: Message[]
  isDark: boolean
  isOpen: boolean
  onClose: () => void
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
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`fixed inset-y-0 left-0 z-50 w-full max-w-sm transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isDark ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl border-r ${
        isDark ? 'border-white/10' : 'border-black/10'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
          <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Branches
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg lg:hidden ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          {/* Current Branch Info */}
          {currentBranch && (
            <div className={`p-4 rounded-xl ${
              isDark ? "bg-purple-500/20 border-purple-500/30 text-purple-300" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-700"
            } backdrop-blur-sm border`}>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4" />
                <p className="font-semibold text-sm">{currentBranch.name}</p>
              </div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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
                  ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                  : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
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
                  ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                  : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
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
                      ? "bg-purple-500/30 border-purple-500/50"
                      : "bg-indigo-500/20 border-indigo-500/40"
                    : isDark
                      ? "bg-white/5 hover:bg-white/10 border-white/10"
                      : "bg-black/5 hover:bg-black/10 border-black/10"
                } backdrop-blur-sm border`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    {branch.name}
                  </span>
                  {branch.parentId && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isDark ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-500/10 text-yellow-700"
                    }`}>
                      forked
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {branch.messages.length} msgs • {branch.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* New Branch Dialog */}
        {showNewBranchDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`p-6 rounded-2xl w-full max-w-sm ${
              isDark ? "bg-gray-900/95 border-white/20" : "bg-white/95 border-black/20"
            } backdrop-blur-xl border shadow-2xl`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
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
                    ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                    : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
                } mb-4`}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateBranch}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm ${
                    isDark
                      ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                      : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                  } backdrop-blur-sm border`}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewBranchDialog(false)}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm ${
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                      : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
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
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isInResponseMode) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [input, isInResponseMode])

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !apiKey) {
      if (!apiKey) setShowApiKeyModal(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    
    // In ephemeral mode, clear input immediately and show thinking
    if (mode === "ephemeral") {
      setInput("")
      setCurrentResponse("Thinking...")
    } else {
      setMessages(updatedMessages)
    }
    
    setIsLoading(true)
    setIsInResponseMode(true)
    
    if (mode === "structured" && currentBranch) {
      await ConversationStore.updateBranch(currentBranch.id, updatedMessages)
    }

    try {
      const response = await fetch(`${REDPILL_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.7,
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

      const finalMessages = [...updatedMessages, assistantMessage]
      
      if (mode === 'ephemeral') {
        // In ephemeral mode, replace the input with the response
        setCurrentResponse(responseContent)
      } else {
        // In structured mode, update messages with the response
        setMessages(finalMessages)
        setCurrentResponse(responseContent)
      }

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
    setIsInResponseMode(false)
    setCurrentResponse("")
    setInput("")
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 100)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        sendMessage()
      }
    }
  }

  // Handle keydown events for the response view
  useEffect(() => {
    const handleResponseKeyDown = (e: KeyboardEvent) => {
      if (isInResponseMode && !isLoading && e.key === 'Enter') {
        e.preventDefault()
        returnToInputState()
      }
    }

    if (isInResponseMode && !isLoading) {
      window.addEventListener('keydown', handleResponseKeyDown)
      return () => {
        window.removeEventListener('keydown', handleResponseKeyDown)
      }
    }
  }, [isInResponseMode, isLoading])

  const themeClasses = isDark
    ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"

  return (
    <div className={`min-h-screen transition-all duration-1000 ${themeClasses} flex flex-col relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/4 w-64 h-64 lg:w-96 lg:h-96 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
            isDark ? "bg-purple-500" : "bg-blue-400"
          }`}
          style={{ animation: "float 6s ease-in-out infinite" }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-48 h-48 lg:w-80 lg:h-80 rounded-full blur-3xl opacity-15 transition-all duration-1000 ${
            isDark ? "bg-blue-500" : "bg-purple-400"
          }`}
          style={{ animation: "float 8s ease-in-out infinite reverse" }}
        />
        <div
          className={`absolute top-1/2 left-1/2 w-32 h-32 lg:w-64 lg:h-64 rounded-full blur-2xl opacity-10 transition-all duration-1000 ${
            isDark ? "bg-pink-500" : "bg-cyan-400"
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
        />
      )}

      {/* Header */}
      <div className={`transition-all duration-500 ${
        isDark ? "bg-black/20 border-b border-white/10" : "bg-white/20 border-b border-black/10"
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
                isDark ? "text-purple-400" : "text-indigo-600"
              }`} />
              <h1 className={`text-lg lg:text-2xl font-bold transition-colors duration-500 ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                Graceful Journey
              </h1>
            </div>

            {/* Right side - Desktop controls */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Mode Switcher */}
              <div className={`flex rounded-xl p-1 transition-all duration-500 ${
                isDark ? "bg-white/10" : "bg-black/10"
              } backdrop-blur-sm border ${isDark ? "border-white/20" : "border-black/20"}`}>
                <button
                  onClick={() => setMode("ephemeral")}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    mode === "ephemeral"
                      ? isDark
                        ? "bg-yellow-500/30 text-yellow-300 shadow-lg shadow-yellow-500/20"
                        : "bg-yellow-500/20 text-yellow-700 shadow-lg shadow-yellow-500/10"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/10"
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
                        ? "bg-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/20"
                        : "bg-blue-500/20 text-blue-700 shadow-lg shadow-blue-500/10"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/10"
                  }`}
                >
                  🌿 Structured
                </button>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-3 rounded-xl transition-all duration-500 ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-yellow-300"
                    : "bg-black/10 hover:bg-black/20 text-indigo-600"
                } backdrop-blur-sm border ${
                  isDark ? "border-white/20" : "border-black/20"
                } hover:scale-105 active:scale-95`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={`px-4 py-2.5 text-sm rounded-xl transition-all duration-500 ${
                  isDark ? "bg-white/10 border-white/20 text-white" : "bg-black/10 border-black/20 text-gray-900"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
                }`}
              >
                {TEE_MODELS.map((model) => (
                  <option key={model.id} value={model.id} className={isDark ? "bg-gray-800" : "bg-white"}>
                    {model.name}
                  </option>
                ))}
              </select>

              <button
                onClick={verifyAttestation}
                disabled={isVerifying}
                className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-500 ${
                  isDark
                    ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                    : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                } backdrop-blur-sm border disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg ${
                  isDark ? "shadow-purple-500/20" : "shadow-indigo-500/10"
                }`}
              >
                {isVerifying ? "Verifying..." : attestation ? "✓ Verified" : "Verify Privacy"}
              </button>
              {apiKey ? (
                <button
                  onClick={handleLogout}
                  className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-500 ${
                    isDark
                      ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30"
                      : "bg-red-500/20 hover:bg-red-500/30 text-red-700 border-red-500/30"
                  } backdrop-blur-sm border hover:scale-105 active:scale-95`}
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-500 ${
                    isDark
                      ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                      : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                  } backdrop-blur-sm border hover:scale-105 active:scale-95`}
                >
                  Login with API Key
                </button>
              )}
            </div>

            {/* Mobile theme toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl transition-all duration-500 ${
                isDark ? "bg-white/10 hover:bg-white/20 text-yellow-300" : "bg-black/10 hover:bg-black/20 text-indigo-600"
              } backdrop-blur-sm border ${isDark ? "border-white/20" : "border-black/20"} lg:hidden`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className={`fixed top-0 left-0 right-0 z-50 p-4 ${
            isDark ? "bg-black/95" : "bg-white/95"
          } backdrop-blur-xl border-b ${isDark ? "border-white/10" : "border-black/10"}`}>
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
              {/* Mode Switcher */}
              <div className={`flex rounded-xl p-1 ${
                isDark ? "bg-white/10" : "bg-black/10"
              } backdrop-blur-sm border ${isDark ? "border-white/20" : "border-black/20"}`}>
                <button
                  onClick={() => {
                    setMode("ephemeral")
                    setShowMobileMenu(false)
                  }}
                  className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                    mode === "ephemeral"
                      ? isDark ? "bg-yellow-500/30 text-yellow-300" : "bg-yellow-500/20 text-yellow-700"
                      : isDark ? "text-gray-300" : "text-gray-600"
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
                      ? isDark ? "bg-blue-500/30 text-blue-300" : "bg-blue-500/20 text-blue-700"
                      : isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  🌿 Structured
                </button>
              </div>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={`w-full px-4 py-3 text-base rounded-xl ${
                  isDark ? "bg-white/10 border-white/20 text-white" : "bg-black/10 border-black/20 text-gray-900"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
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
                  setShowMobileMenu(false)
                }}
                className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                  isDark
                    ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                    : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                } backdrop-blur-sm border`}
              >
                {isVerifying ? "Verifying..." : attestation ? "✓ Verified" : "Verify Privacy"}
              </button>

              <button
                onClick={handleNewConversation}
                className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                    : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
                } backdrop-blur-sm border`}
              >
                New Conversation
              </button>

              {apiKey ? (
                <button
                  onClick={handleLogout}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-xl ${
                    isDark
                      ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30"
                      : "bg-red-500/20 hover:bg-red-500/30 text-red-700 border-red-500/30"
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
                      ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                      : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                  } backdrop-blur-sm border`}
                >
                  Login with API Key
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-4 py-4 lg:py-8 max-w-4xl mx-auto w-full">
        {/* One Bubble Chat Interface */}
        <div className={`flex-1 transition-all duration-500 ${
          isDark ? "bg-white/10 border-white/20" : "bg-black/10 border-black/20"
        } backdrop-blur-xl border rounded-2xl p-4 lg:p-6 shadow-2xl overflow-hidden flex flex-col min-h-0`}>
          
          {isInResponseMode ? (
            <div className="flex-1 overflow-y-auto flex items-center justify-center min-h-0">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className={`prose prose-sm lg:prose-lg max-w-none w-full ${isDark ? 'text-white' : 'text-gray-900'} overflow-y-auto max-h-[60vh]`}>
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
                              isDark ? "text-blue-400" : "text-blue-600"
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
                                isDark ? "bg-black/30" : "bg-white/50"
                              }`}
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <pre
                              className={`p-4 rounded-lg my-3 overflow-x-auto transition-colors duration-500 ${
                                isDark ? "bg-black/30" : "bg-white/50"
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
                      onClick={returnToInputState}
                      className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                        isDark
                          ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-200"
                          : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700"
                      } backdrop-blur-sm hover:scale-105 active:scale-95 flex-1 sm:flex-none`}
                    >
                      New Message
                    </button>
                    {messages.length > 0 && mode === "ephemeral" && (
                      <button
                        onClick={handlePinConversation}
                        className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                          isDark
                            ? "bg-blue-500/30 hover:bg-blue-500/40 text-blue-200"
                            : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-700"
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
                    />
                    
                    {/* Send Button - Mobile floating */}
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !input.trim()}
                      className={`absolute bottom-2 right-2 p-2 lg:p-3 rounded-full transition-all duration-300 ${
                        isDark
                          ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                          : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                      } backdrop-blur-sm border disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 lg:rounded-lg lg:px-4 lg:py-2`}
                    >
                      <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span className="hidden lg:inline ml-2 text-sm font-medium">Send</span>
                    </button>
                  </div>
                  
                  {/* Input hints */}
                  <div className="flex items-center justify-between mt-3 text-xs lg:text-sm">
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      ⏎ to send • ⇧⏎ for new line
                    </span>
                    {messages.length > 0 && (
                      <button
                        onClick={handleNewConversation}
                        className={`px-2 py-1 text-xs rounded transition-all duration-300 ${
                          isDark
                            ? "bg-white/10 hover:bg-white/20 text-gray-300"
                            : "bg-black/10 hover:bg-black/20 text-gray-700"
                        } backdrop-blur-sm hover:scale-105 active:scale-95`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className={`text-center mt-4 text-xs lg:text-sm ${
          isDark ? 'text-gray-500' : 'text-gray-600'
        }`}>
          🔒 {mode === "ephemeral" 
            ? "Ephemeral session • No history stored" 
            : `Branch: ${currentBranch?.name || "Main"}`}
        </div>
      </div>

      <style jsx>{`
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
    </div>
  )
}

export default App