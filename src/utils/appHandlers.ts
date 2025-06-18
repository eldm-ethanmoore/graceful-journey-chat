import { ConversationStore } from '../conversationStore'
import { secureStorage } from './secureStorage'
import type { Branch, Message } from '../conversationStore'

// Branch handling functions
export const handleBranchSelect = async (
  branch: Branch,
  setCurrentBranch: (branch: Branch) => void,
  setMessages: (messages: Message[]) => void,
  setMode: (mode: "ephemeral" | "structured") => void,
  returnToInputState: () => void
) => {
  setCurrentBranch(branch)
  
  // Load branch-specific conversation context from binds
  try {
    // Get all binds for this branch from the database
    const branchBinds = await ConversationStore.getBranchBinds(branch.id)
    
    if (branchBinds.length > 0) {
      // Sort binds by creation date to maintain conversation order
      const sortedBinds = branchBinds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      
      // Convert binds to messages for the chat interface
      const messagesFromBinds = sortedBinds.flatMap(bind => [bind.userPrompt, bind.aiResponse])
      setMessages(messagesFromBinds)
    } else {
      // Fallback to branch.messages if no binds exist (backward compatibility)
      if (branch.messages) {
        setMessages(branch.messages)
      } else {
        setMessages([])
      }
    }
  } catch (error) {
    console.error("Failed to load branch binds:", error)
    
    // Fallback to branch.messages on error
    if (branch.messages) {
      setMessages(branch.messages)
    } else {
      setMessages([])
    }
  }
  
  setMode("structured")
  returnToInputState()
}

export const handleCreateBranch = async (
  name: string,
  messages: Message[],
  currentBranch: Branch | null,
  setCurrentBranch: (branch: Branch) => void,
  setMode: (mode: "ephemeral" | "structured") => void
) => {
  if (!currentBranch) {
    throw new Error("No current branch to create from")
  }
  const newBranch = await ConversationStore.createBranch(name, messages, currentBranch.ideaId, currentBranch.id)
  setCurrentBranch(newBranch)
  setMode("structured")
}

export const handlePinConversation = async (
  messages: Message[],
  setCurrentBranch: (branch: Branch) => void,
  setMode: (mode: "ephemeral" | "structured") => void
) => {
  // Create a new idea for pinned conversations
  const newIdea = await ConversationStore.createIdea("Pinned Conversation", "Conversation pinned from ephemeral mode")
  const ideaBranches = await ConversationStore.getIdeaBranches(newIdea.id)
  
  if (ideaBranches.length > 0) {
    // Update the main branch with the messages
    const mainBranch = ideaBranches[0]
    // Create a new branch with the messages in this idea
    const updatedBranch = await ConversationStore.createBranch("Main", messages, newIdea.id)
    setCurrentBranch(updatedBranch)
    setMode("structured")
  }
  // After pinning, stay in the same view but now in structured mode
}

// Conversation management
export const handleNewConversation = (
  setMessages: (messages: Message[]) => void,
  setCurrentBranch: (branch: Branch | null) => void,
  setMode: (mode: "ephemeral" | "structured") => void,
  setCurrentResponse: (response: string) => void,
  setIsInResponseMode: (mode: boolean) => void,
  setInput: (input: string) => void,
  setShowMobileMenu: (show: boolean) => void,
  setContextPreviewContent: (content: string) => void,
  setIsContextEdited: (edited: boolean) => void,
  setShowContextPreview: (show: boolean) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) => {
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

// API key management
export const handleSaveApiKeys = (
  keys: { redpill: string; openrouter: string },
  setApiKey: (key: string) => void,
  setOpenRouterApiKey: (key: string) => void,
  setShowApiKeyModal: (show: boolean) => void
) => {
  ConversationStore.setRedPillApiKey(keys.redpill);
  setApiKey(keys.redpill);
  ConversationStore.setOpenRouterApiKey(keys.openrouter);
  setOpenRouterApiKey(keys.openrouter);
  setShowApiKeyModal(false);
}

export const handleLogout = (
  setApiKey: (key: string | null) => void,
  setOpenRouterApiKey: (key: string | null) => void,
  setShowApiKeyModal: (show: boolean) => void,
  handleNewConversationCallback: () => void
) => {
  secureStorage.remove('redpill_api_key');
  secureStorage.remove('openrouter_api_key');
  setApiKey(null);
  setOpenRouterApiKey(null);
  setShowApiKeyModal(true)
  handleNewConversationCallback()
}

// File handling
export const handleFileSelect = (
  e: React.ChangeEvent<HTMLInputElement>,
  setAttachment: (attachment: { file: File; preview: string } | null) => void
) => {
  const file = e.target.files?.[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({ file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
  }
}

// Export functionality
export const handleExport = (
  messages: Message[],
  exportWithSystemPrompt: boolean
) => {
  const systemPrompt = exportWithSystemPrompt ? ConversationStore.generateSystemPrompt(messages) : undefined;
  const markdown = ConversationStore.exportAsMarkdown(messages, systemPrompt);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${new Date().toISOString()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Input handling
export const handleKeyDown = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  isInResponseMode: boolean,
  returnToInputState: () => void,
  input: string,
  isLoading: boolean,
  sendMessage: () => void
) => {
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

// Cancel functionality
export const handleCancel = (abortController: AbortController | null) => {
  if (abortController) {
    abortController.abort();
  }
}