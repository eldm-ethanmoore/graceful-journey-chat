import { ConversationStore } from '../conversationStore'
import { parseMarkdownContext } from './contextUtils'
import type { Message } from '../conversationStore'

interface SendMessageParams {
  input: string
  attachment: { file: File; preview: string } | null
  messages: Message[]
  isLoading: boolean
  apiKey: string | null
  openRouterApiKey: string | null
  selectedModel: string
  temperature: number
  maxTokens: number
  attestation: any
  mode: "ephemeral" | "structured"
  currentBranch: any
  isContextEdited: boolean
  contextPreviewContent: string
  setMessages: (messages: Message[]) => void
  setInput: (input: string) => void
  setAttachment: (attachment: { file: File; preview: string } | null) => void
  setCurrentResponse: (response: string) => void
  setIsLoading: (loading: boolean) => void
  setIsInResponseMode: (mode: boolean) => void
  setIsContextEdited: (edited: boolean) => void
  setContextPreviewContent: (content: string) => void
  setShowContextPreview: (show: boolean) => void
  setShowApiKeyModal: (show: boolean) => void
  abortController: AbortController
}

export const sendMessage = async (params: SendMessageParams): Promise<void> => {
  const {
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
    abortController
  } = params;

  console.log("sendMessage called with input:", input)
  
  // Store the current input value to ensure we use it throughout this function
  // This prevents issues with state updates clearing the input before we use it
  const currentInput = input;
  
  // Don't proceed if there's no input, we're already loading, or there's no API key
  if ((!currentInput.trim() && !attachment) || isLoading || (!apiKey && !openRouterApiKey)) {
    console.log("Not sending message:", {
      emptyInput: !currentInput.trim() && !attachment,
      isLoading,
      noApiKey: !apiKey && !openRouterApiKey
    })
    if (!apiKey && !openRouterApiKey) setShowApiKeyModal(true)
    return
  }
  
  // Log settings state for debugging
  console.log("Current settings:", {
    temperature,
    maxTokens
  })
  
  // We no longer intercept history queries - let the LLM handle them

  let messageContent: Message['content'];
  if (attachment) {
    messageContent = [{ type: 'text', text: currentInput }];
    messageContent.push({
      type: 'image_url',
      image_url: { url: attachment.preview as string },
    });
  } else {
    messageContent = currentInput;
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: messageContent,
    timestamp: new Date(),
  }

  // Always update messages array immediately to ensure history is preserved
  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  
  // Clear input and show thinking state
  // Clear input first to prevent "double send" issues
  setInput("");
  setAttachment(null);
  
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
        content: ConversationStore.generateSystemPrompt(messages)
      };
      
      // Make sure we're sending ALL previous messages to maintain conversation history
      // Get all messages including the new user message
      const allMessages = [...messages, userMessage];
      console.log("Sending conversation history with", allMessages.length, "messages");
      
      // Format messages for the API with explicit timestamps for all messages
      const timestampedMessages = allMessages.map(m => {
        if (m.role === "user") {
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
          let finalContent: Message['content'];

          if (typeof m.content === 'string') {
            const cleanedContent = m.content.replace(/^\[\d{1,2}\/\d{1,2}\/\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\]\s*/i, '');
            finalContent = `[TIME: ${timestamp}] ${cleanedContent}`;
          } else {
            // It's an array
            finalContent = m.content.map(part => {
              if (part.type === 'text') {
                return { ...part, text: `[TIME: ${timestamp}] ${part.text}` };
              }
              return part;
            });
          }
          return { role: m.role, content: finalContent };
        }
        return { role: m.role, content: m.content };
      });
      
      // Combine system message with the conversation history
      apiMessages = [systemMessage, ...timestampedMessages];
    }
    
    const isRedPill = ConversationStore.isRedPillModel(selectedModel)
    const REDPILL_API_URL = "https://api.redpill.ai/v1"
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1"
    const apiUrl = isRedPill ? REDPILL_API_URL : OPENROUTER_API_URL
    const activeApiKey = isRedPill ? apiKey : openRouterApiKey

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeApiKey}`,
    }

    if (!isRedPill) {
      // OpenRouter requires these headers.
      // Use a generic referrer or your app's actual URL.
      headers["HTTP-Referer"] = "http://localhost:5173"
      headers["X-Title"] = "Graceful Journey Chat"
    }

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: selectedModel,
        messages: apiMessages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: abortController.signal,
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
    const finalMessages = [...updatedMessages, assistantMessage];
    
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
    if (error.name === 'AbortError') {
      setCurrentResponse("Request cancelled.");
    } else {
      const errorMessage = error.message || "Failed to send message. Please check your API key and connection."
      setCurrentResponse(`Error: ${errorMessage}`)
    }
  } finally {
    setIsLoading(false)
  }
}