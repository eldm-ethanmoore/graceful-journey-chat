import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { TreeNavigationPanel } from "./components/TreeNavigationPanel"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message as StoredMessage, Bind } from "./conversationStore"
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
  const [currentIdea, setCurrentIdea] = useState<any | null>(null)
  const [branchBinds, setBranchBinds] = useState<any[]>([])
  const [mode, setMode] = useState<"ephemeral" | "structured">("ephemeral")
  const [currentBindId, setCurrentBindId] = useState<string | null>(null)
  const [isBindLocked, setIsBindLocked] = useState(false)
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
  const [showEditResponseModal, setShowEditResponseModal] = useState(false)
  const [editingResponse, setEditingResponse] = useState("")
  const [showRetroactiveBindModal, setShowRetroactiveBindModal] = useState(false)
  const [selectedMessagePairs, setSelectedMessagePairs] = useState<{userMsg: Message, aiMsg: Message}[]>([])
  const [availableMessagePairs, setAvailableMessagePairs] = useState<{userMsg: Message, aiMsg: Message, index: number}[]>([])
  const [hasCreatedBindForCurrentResponse, setHasCreatedBindForCurrentResponse] = useState(false)
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
    // Only load existing ideas/branches on startup, don't create new ones
    loadExistingData()
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

  // Filter available message pairs for retroactive bind creation
  useEffect(() => {
    const filterAvailablePairs = async () => {
      if (!showRetroactiveBindModal || !currentBranch) {
        setAvailableMessagePairs([]);
        return;
      }

      // Get all message pairs
      const allPairs = messages.reduce((pairs: {userMsg: Message, aiMsg: Message, index: number}[], msg, index) => {
        if (msg.role === 'user' && messages[index + 1]?.role === 'assistant') {
          pairs.push({
            userMsg: msg,
            aiMsg: messages[index + 1],
            index: Math.floor(index / 2)
          });
        }
        return pairs;
      }, []);

      // Filter out current active response (if in response mode and this is the last pair)
      let filteredPairs = allPairs;
      if (isInResponseMode && allPairs.length > 0) {
        filteredPairs = allPairs.slice(0, -1); // Remove last pair if in response mode
      }

      // Filter out pairs that already exist as binds
      try {
        const existingBinds = await ConversationStore.getBranchBinds(currentBranch.id);
        const availablePairs = filteredPairs.filter(pair => {
          const userContent = typeof pair.userMsg.content === 'string' ? pair.userMsg.content : JSON.stringify(pair.userMsg.content);
          const aiContent = typeof pair.aiMsg.content === 'string' ? pair.aiMsg.content : JSON.stringify(pair.aiMsg.content);
          
          const pairExists = existingBinds.some(bind => {
            const bindUserContent = typeof bind.userPrompt.content === 'string' ? bind.userPrompt.content : JSON.stringify(bind.userPrompt.content);
            const bindAiContent = typeof bind.aiResponse.content === 'string' ? bind.aiResponse.content : JSON.stringify(bind.aiResponse.content);
            
            return userContent === bindUserContent && aiContent === bindAiContent;
          });
          
          return !pairExists; // Include only pairs that don't already exist as binds
        });

        setAvailableMessagePairs(availablePairs);
      } catch (error) {
        console.error("Error filtering available pairs:", error);
        setAvailableMessagePairs(filteredPairs); // Fallback to basic filtering
      }
    };

    filterAvailablePairs();
  }, [showRetroactiveBindModal, messages, currentBranch, isInResponseMode]);

  const loadExistingData = async () => {
    const ideas = await ConversationStore.getAllIdeas()
    if (ideas.length > 0) {
      // Get the most recent idea and its latest branch
      const latestIdea = ideas.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
      setCurrentIdea(latestIdea)
      const ideaBranches = await ConversationStore.getIdeaBranches(latestIdea.id)
      
      if (ideaBranches.length > 0) {
        const latestBranch = ideaBranches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        setCurrentBranch(latestBranch)
        
        // Load branch-specific conversation context from binds
        try {
          const branchBinds = await ConversationStore.getBranchBinds(latestBranch.id)
          setBranchBinds(branchBinds)
          
          if (branchBinds.length > 0) {
            // Sort binds by creation date to maintain conversation order
            const sortedBinds = branchBinds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            
            // Convert binds to messages for the chat interface
            const messagesFromBinds = sortedBinds.flatMap(bind => [bind.userPrompt, bind.aiResponse])
            setMessages(messagesFromBinds)
            setMode("structured") // Set to structured mode if we have existing data
          } else {
            // Fallback to branch.messages if no binds exist (backward compatibility)
            if (latestBranch.messages) {
              setMessages(latestBranch.messages)
              setMode("structured")
            } else {
              setMessages([])
            }
          }
        } catch (error) {
          console.error("Failed to load branch binds:", error)
          setBranchBinds([])
          
          // Fallback to branch.messages on error
          if (latestBranch.messages) {
            setMessages(latestBranch.messages)
            setMode("structured")
          } else {
            setMessages([])
          }
        }
      }
    }
    // If no ideas exist, stay in ephemeral mode and don't prompt
  }

  const loadOrCreateDefaultBranch = async (): Promise<boolean> => {
    const ideas = await ConversationStore.getAllIdeas()
    if (ideas.length === 0) {
      // Prompt user to name their first idea
      const ideaName = prompt("Welcome to Structured Mode! What would you like to name your first idea?", "My First Idea")
      
      if (ideaName && ideaName.trim()) {
        // Create idea with user-provided name
        const defaultIdea = await ConversationStore.createIdea(ideaName.trim(), "Your first conversation space")
        setCurrentIdea(defaultIdea)
        const ideaBranches = await ConversationStore.getIdeaBranches(defaultIdea.id)
        if (ideaBranches.length > 0) {
          setCurrentBranch(ideaBranches[0])
          setMessages([])
          setBranchBinds([])
        }
        return true
      } else {
        // User cancelled or provided empty name, stay in ephemeral mode
        console.log("User cancelled idea creation, staying in ephemeral mode")
        return false
      }
    } else {
      // Get the most recent idea and its latest branch
      const latestIdea = ideas.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
      setCurrentIdea(latestIdea)
      const ideaBranches = await ConversationStore.getIdeaBranches(latestIdea.id)
      
      if (ideaBranches.length > 0) {
        const latestBranch = ideaBranches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        setCurrentBranch(latestBranch)
        
        // Load branch-specific conversation context from binds
        try {
          const branchBinds = await ConversationStore.getBranchBinds(latestBranch.id)
          setBranchBinds(branchBinds)
          
          if (branchBinds.length > 0) {
            // Sort binds by creation date to maintain conversation order
            const sortedBinds = branchBinds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            
            // Convert binds to messages for the chat interface
            const messagesFromBinds = sortedBinds.flatMap(bind => [bind.userPrompt, bind.aiResponse])
            setMessages(messagesFromBinds)
          } else {
            // Fallback to branch.messages if no binds exist (backward compatibility)
            if (latestBranch.messages) {
              setMessages(latestBranch.messages)
            } else {
              setMessages([])
            }
          }
        } catch (error) {
          console.error("Failed to load branch binds:", error)
          setBranchBinds([])
          
          // Fallback to branch.messages on error
          if (latestBranch.messages) {
            setMessages(latestBranch.messages)
          } else {
            setMessages([])
          }
        }
      } else {
        // Create a main branch for this idea if none exists
        const mainBranch = await ConversationStore.createBranch("Main", [], latestIdea.id)
        setCurrentBranch(mainBranch)
        setMessages([])
        setBranchBinds([])
      }
    }
    return true
  }

  const handleModeSwitch = async (newMode: "ephemeral" | "structured") => {
    if (newMode === "structured") {
      const success = await loadOrCreateDefaultBranch()
      if (success) {
        setMode("structured")
      }
      // If not successful (user cancelled), stay in current mode
    } else {
      setMode(newMode)
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
    
    // Reset bind creation flag for new response
    setHasCreatedBindForCurrentResponse(false)
    
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
    // Load the idea for this branch
    const idea = await ConversationStore.getIdea(branch.ideaId);
    setCurrentIdea(idea);
    
    // Load the binds for this branch
    const branchBinds = await ConversationStore.getBranchBinds(branch.id);
    setBranchBinds(branchBinds);
    
    // Call the original handler
    handlers.handleBranchSelect(branch, setCurrentBranch, setMessages, setMode, returnToInputState);
  };

  const handleCreateIdea = async (name: string) => {
    try {
      const newIdea = await ConversationStore.createIdea(name, "New conversation space")
      const ideaBranches = await ConversationStore.getIdeaBranches(newIdea.id)
      if (ideaBranches.length > 0) {
        setCurrentBranch(ideaBranches[0])
        setMode("structured")
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to create idea:", error)
      throw error
    }
  }

  const handleNewConversation = () =>
    handlers.handleNewConversation(
      setMessages, setCurrentBranch, setMode, setCurrentResponse, setIsInResponseMode,
      setInput, setShowMobileMenu, setContextPreviewContent, setIsContextEdited,
      setShowContextPreview, textareaRef
    );

  const handlePinConversation = async () =>
    handlers.handlePinConversation(messages, setCurrentBranch, setMode);

  const handleCreateBind = async (userPrompt: Message, aiResponse: string) => {
    if (!currentBranch) return;
    
    const aiMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content: aiResponse,
      timestamp: new Date()
    };

    try {
      const bind = await ConversationStore.createBind(userPrompt, aiMessage, currentBranch.id);
      setCurrentBindId(bind.id);
      setIsBindLocked(false);
    } catch (error) {
      console.error("Failed to create bind:", error);
    }
  };

  const handleLockBind = async (bindId: string) => {
    try {
      await ConversationStore.lockBind(bindId);
      setIsBindLocked(true);
    } catch (error) {
      console.error("Failed to lock bind:", error);
    }
  };
  
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
                             e.target instanceof HTMLSelectElement ||
                             e.target instanceof HTMLButtonElement; // Also exclude buttons
                             
      // Don't handle Enter if user is interacting with response buttons
      const isClickingResponseButton = (e.target as HTMLElement)?.closest('.response-actions');
                             
      if (e.key === 'Enter' && !e.shiftKey && isInResponseMode && !isInFormElement && !isClickingResponseButton) {
        // Add a small delay to allow button clicks to process first
        setTimeout(() => {
          console.log("Enter key pressed globally while in response mode")
          returnToInputState()
        }, 100)
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

      {/* Tree Navigation Panel */}
      <TreeNavigationPanel
        currentBranch={currentBranch}
        onBranchSelect={handleBranchSelect}
        onCreateBranch={handleCreateIdea}
        isDark={isDark}
        expandedView={showBranchPanel}
        onClose={() => setShowBranchPanel(false)}
        mode={mode}
        setMode={handleModeSwitch}
        apiKey={apiKey}
        openRouterApiKey={openRouterApiKey}
        handleLogout={handleLogout}
        setShowApiKeyModal={setShowApiKeyModal}
        handlePinConversation={handlePinConversation}
        messages={messages}
      />

      {/* Header */}
      <HeaderSection
        isDark={isDark}
        setIsDark={setIsDark}
        hasConsented={hasConsented}
        mode={mode}
        setMode={handleModeSwitch}
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
        setIsDark={setIsDark}
        hasConsented={hasConsented}
        mode={mode}
        setMode={handleModeSwitch}
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
        isSending={isSending}
        isReceiving={isReceiving}
        pipingSyncManager={pipingSyncManager}
        syncWarningAcknowledged={syncWarningAcknowledged}
        setPendingSendAction={setPendingSendAction}
        setShowSyncWarning={setShowSyncWarning}
        setPendingReceiveAction={setPendingReceiveAction}
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
        
        {/* Persistent Action Buttons - Top level, next to settings */}
        {!isInResponseMode && !isLoading && messages.length > 0 && mode === "structured" && (
          <div className="mb-6 flex justify-center gap-3 flex-wrap">
            <button
              onClick={async () => {
                const branchName = prompt("Enter name for new branch:");
                if (branchName && branchName.trim() && currentBranch) {
                  try {
                    // Create a new branch from current conversation state within the same idea
                    const newBranch = await ConversationStore.createBranch(branchName.trim(), messages, currentBranch.ideaId, currentBranch.id);
                    setCurrentBranch(newBranch);
                    setMode("structured");
                  } catch (error) {
                    console.error("Failed to create branch:", error);
                    alert("Failed to create branch. Please try again.");
                  }
                }
              }}
              className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? "bg-orange-500/30 hover:bg-orange-500/40 text-orange-300"
                  : "bg-orange-500/20 hover:bg-orange-500/30 text-orange-600"
              } backdrop-blur-sm hover:scale-105 active:scale-95`}
            >
              🌿 Create Branch
            </button>

            <button
              onClick={() => {
                setShowRetroactiveBindModal(true);
              }}
              className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300"
                  : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-600"
              } backdrop-blur-sm hover:scale-105 active:scale-95`}
            >
              📚 Create Binds from History
            </button>
          </div>
        )}
        
        {/* Response Action Buttons - Below Settings */}
        {isInResponseMode && !isLoading && (
          <div className="mb-4 flex justify-center gap-3 flex-wrap">
            {mode === "structured" && !isBindLocked && (
              <button
                onClick={() => {
                  setEditingResponse(currentResponse);
                  setShowEditResponseModal(true);
                }}
                className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-300"
                    : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600"
                } backdrop-blur-sm hover:scale-105 active:scale-95`}
              >
                ✏️ Edit Response
              </button>
            )}

            {mode === "structured" && currentBranch && messages.length > 0 && !hasCreatedBindForCurrentResponse && (
              <button
                onClick={async () => {
                  // Get the last user message and create a bind with current response
                  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                  if (lastUserMessage && currentResponse.trim()) {
                    await handleCreateBind(lastUserMessage, currentResponse);
                    setHasCreatedBindForCurrentResponse(true);
                    
                    // Refresh the branch binds to show the new bind
                    if (currentBranch) {
                      const updatedBinds = await ConversationStore.getBranchBinds(currentBranch.id);
                      setBranchBinds(updatedBinds);
                    }
                  }
                }}
                className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4]"
                    : "bg-[#0088fb]/20 hover:bg-[#0088fb]/30 text-[#0088fb]"
                } backdrop-blur-sm hover:scale-105 active:scale-95`}
              >
                🔒 Lock In Bind
              </button>
            )}

            <button
              onClick={() => {
                returnToInputState();
                setTimeout(() => {
                  const textarea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
                  if (textarea) {
                    textarea.focus();
                  }
                }, 150);
              }}
              className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                isDark
                  ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71]"
                  : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95]"
              } backdrop-blur-sm hover:scale-105 active:scale-95`}
            >
              {mode === "structured" ? "Continue" : "New Message"}
            </button>
            
            {messages.length > 0 && mode === "ephemeral" && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePinConversation();
                }}
                className={`px-4 lg:px-5 py-2 lg:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4]"
                    : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95]"
                } backdrop-blur-sm hover:scale-105 active:scale-95`}
              >
                📌 Pin & Switch to Structured
              </button>
            )}
          </div>
        )}
        
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
          onCreateBind={handleCreateBind}
          onLockBind={handleLockBind}
          currentBindId={currentBindId}
          isBindLocked={isBindLocked}
          currentBranch={currentBranch}
          onUpdateCurrentResponse={setCurrentResponse}
          currentIdea={currentIdea}
          branchBinds={branchBinds}
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
      
      {/* Edit Response Modal */}
      {showEditResponseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-6 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col ${
            isDark ? "bg-gray-900/95 border-white/20" : "bg-white/95 border-black/20"
          } backdrop-blur-xl border shadow-2xl`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Edit AI Response
            </h3>
            <textarea
              value={editingResponse}
              onChange={(e) => setEditingResponse(e.target.value)}
              className={`w-full flex-1 min-h-[300px] p-4 rounded-xl resize-none ${
                isDark
                  ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                  : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
              } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                isDark ? "focus:ring-yellow-500/50" : "focus:ring-yellow-500/50"
              } mb-6`}
              placeholder="Edit the AI response..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentResponse(editingResponse);
                  setShowEditResponseModal(false);
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isDark
                    ? "bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-300 border-yellow-500/30"
                    : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 border-yellow-500/30"
                } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditResponseModal(false);
                  setEditingResponse("");
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                    : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
                } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Retroactive Bind Creation Modal */}
      {showRetroactiveBindModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`p-6 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col ${
            isDark ? "bg-gray-900/95 border-white/20" : "bg-white/95 border-black/20"
          } backdrop-blur-xl border shadow-2xl`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Create Binds from Conversation History
            </h3>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Select message pairs from your conversation history to convert into binds. Each bind consists of a user message and the AI response that follows it.
            </p>
            
            <div className="flex-1 overflow-y-auto mb-6">
              {availableMessagePairs.length > 0 ? (
                <div className="space-y-3">
                  {availableMessagePairs.map((pair, pairIndex) => {
                    const isSelected = selectedMessagePairs.some(selected =>
                      selected.userMsg.id === pair.userMsg.id && selected.aiMsg.id === pair.aiMsg.id
                    );
                    
                    return (
                      <div
                        key={`${pair.userMsg.id}-${pair.aiMsg.id}`}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? isDark
                              ? "bg-purple-500/20 border-purple-500/50"
                              : "bg-purple-500/10 border-purple-500/40"
                            : isDark
                              ? "bg-white/5 border-white/10 hover:bg-white/10"
                              : "bg-black/5 border-black/10 hover:bg-black/10"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMessagePairs(prev =>
                              prev.filter(selected =>
                                !(selected.userMsg.id === pair.userMsg.id && selected.aiMsg.id === pair.aiMsg.id)
                              )
                            );
                          } else {
                            setSelectedMessagePairs(prev => [...prev, {userMsg: pair.userMsg, aiMsg: pair.aiMsg}]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDark ? "text-purple-300" : "text-purple-600"}`}>
                            Message Pair #{pairIndex + 1}
                          </span>
                          {isSelected && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isDark ? "bg-purple-500/30 text-purple-300" : "bg-purple-500/20 text-purple-600"
                            }`}>
                              Selected
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/10" : "bg-blue-500/5"}`}>
                            <div className={`text-xs font-medium mb-1 ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                              👤 User:
                            </div>
                            <div className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                              {typeof pair.userMsg.content === 'string'
                                ? pair.userMsg.content.substring(0, 150) + (pair.userMsg.content.length > 150 ? '...' : '')
                                : '[Complex content]'
                              }
                            </div>
                          </div>
                          
                          <div className={`p-2 rounded-lg ${isDark ? "bg-green-500/10" : "bg-green-500/5"}`}>
                            <div className={`text-xs font-medium mb-1 ${isDark ? "text-green-300" : "text-green-600"}`}>
                              🤖 Assistant:
                            </div>
                            <div className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                              {typeof pair.aiMsg.content === 'string'
                                ? pair.aiMsg.content.substring(0, 150) + (pair.aiMsg.content.length > 150 ? '...' : '')
                                : '[Complex content]'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <p className="text-lg mb-2">📭 No message pairs available to convert</p>
                  <p className="text-sm">
                    {isInResponseMode
                      ? "Complete your current response first, or all message pairs have already been converted to binds."
                      : "All message pairs have already been converted to binds."
                    }
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (selectedMessagePairs.length > 0 && currentBranch) {
                    try {
                      for (const pair of selectedMessagePairs) {
                        await ConversationStore.createBind(pair.userMsg, pair.aiMsg, currentBranch.id);
                      }
                      setSelectedMessagePairs([]);
                      setShowRetroactiveBindModal(false);
                      // Optionally show success message
                      alert(`Successfully created ${selectedMessagePairs.length} bind(s) from conversation history!`);
                    } catch (error) {
                      console.error("Failed to create binds:", error);
                      alert("Failed to create binds. Please try again.");
                    }
                  }
                }}
                disabled={selectedMessagePairs.length === 0}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  selectedMessagePairs.length > 0
                    ? isDark
                      ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                      : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 border-purple-500/30"
                    : "bg-gray-500/20 text-gray-500 border-gray-500/20 cursor-not-allowed"
                } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
              >
                Create {selectedMessagePairs.length} Bind{selectedMessagePairs.length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => {
                  setShowRetroactiveBindModal(false);
                  setSelectedMessagePairs([]);
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                    : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
                } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App