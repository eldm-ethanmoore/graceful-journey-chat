import { useState, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { X, Send, Paperclip, Eye } from "lucide-react"
import { LiquidGlassWrapper } from "./LiquidGlassWrapper"
import { ContextPreview } from "../ContextPreview"
import { ConversationStore } from "../conversationStore"

interface ChatInterfaceProps {
  showSettings: boolean
  isDark: boolean
  isInResponseMode: boolean
  isLoading: boolean
  currentResponse: string
  handleCancel: () => void
  returnToInputState: () => void
  enableTimestamps: boolean
  showTimestamps: boolean
  messages: any[]
  attachment: { file: File; preview: string } | null
  setAttachment: (attachment: { file: File; preview: string } | null) => void
  input: string
  setInput: (input: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  selectedModel: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  sendMessage: () => void
  showContextPreview: boolean
  setShowContextPreview: (show: boolean) => void
  contextPreviewContent: string
  setContextPreviewContent: (content: string) => void
  isContextEdited: boolean
  setIsContextEdited: (edited: boolean) => void
  generateContextPreview: () => string
  handleNewConversation: () => void
  mode: "ephemeral" | "structured"
  handlePinConversation: () => void
  onCreateBind?: (userPrompt: any, aiResponse: string) => void
  onLockBind?: (bindId: string) => void
  currentBindId?: string | null
  isBindLocked?: boolean
  currentBranch?: any | null
  onUpdateCurrentResponse?: (response: string) => void
  currentIdea?: any | null
  branchBinds?: any[]
}

export const ChatInterface = ({
  showSettings,
  isDark,
  isInResponseMode,
  isLoading,
  currentResponse,
  handleCancel,
  returnToInputState,
  enableTimestamps,
  showTimestamps,
  messages,
  attachment,
  setAttachment,
  input,
  setInput,
  handleKeyDown,
  selectedModel,
  textareaRef,
  fileInputRef,
  handleFileSelect,
  sendMessage,
  showContextPreview,
  setShowContextPreview,
  contextPreviewContent,
  setContextPreviewContent,
  isContextEdited,
  setIsContextEdited,
  generateContextPreview,
  handleNewConversation,
  mode,
  handlePinConversation,
  onCreateBind,
  onLockBind,
  currentBindId,
  isBindLocked,
  currentBranch,
  onUpdateCurrentResponse,
  currentIdea,
  branchBinds
}: ChatInterfaceProps) => {
  const [showQA, setShowQA] = useState(false);

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper function to get the latest Q/A from binds
  const getLatestQA = () => {
    if (!branchBinds || branchBinds.length === 0) return null;
    
    const latestBind = branchBinds[branchBinds.length - 1];
    const userContent = typeof latestBind.userPrompt.content === 'string'
      ? latestBind.userPrompt.content
      : '[Complex content]';
    const aiContent = typeof latestBind.aiResponse.content === 'string'
      ? latestBind.aiResponse.content
      : '[Complex content]';
    
    return {
      question: truncateText(userContent, 50),
      answer: truncateText(aiContent, 50)
    };
  };
  return (
    <div className={`transition-all duration-300 ${
      showSettings
        ? (showContextPreview ? 'h-[39vh] mt-6' : 'h-[30vh] mt-6')
        : (showContextPreview ? 'h-[53.3vh]' : 'h-[41vh]')
    }`}>
      <LiquidGlassWrapper
        className="chat-box rounded-2xl p-4 lg:p-6 overflow-hidden flex flex-col min-h-0 w-full h-full items-center justify-center"
        isDark={isDark}
      >
        {/* Enhanced Branch Context Indicator - Inside chatbox at top with spacing */}
        {mode === "structured" && currentBranch && (
          <div
            className={`w-full mt-1 mb-24 p-3 rounded-xl cursor-pointer transition-all duration-500 ${
              isDark ? "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15" : "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/15"
            } border backdrop-blur-sm`}
            onMouseEnter={() => setShowQA(true)}
            onMouseLeave={() => setShowQA(false)}
            onClick={() => setShowQA(!showQA)}
          >
            <div className={`text-xs font-medium ${
              isDark ? "text-purple-300" : "text-indigo-600"
            }`}>
              {/* Idea and Branch Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>💡</span>
                  <span className="font-bold">
                    {currentIdea ? truncateText(currentIdea.name, 25) : 'Loading...'}
                  </span>
                  <span className={`${isDark ? "text-purple-400" : "text-indigo-500"}`}>→</span>
                  <span>🌿</span>
                  <span className="font-bold">
                    {truncateText(currentBranch.name, 20)}
                  </span>
                </div>
                <div className={`text-xs ${isDark ? "text-purple-400" : "text-indigo-500"}`}>
                  {branchBinds ? branchBinds.length : 0} binds • {Math.floor(messages.length / 2)} exchanges
                </div>
              </div>
              
              {/* Latest Q/A Preview with Bind ID - Show on hover/tap with smooth animation */}
              <div className={`overflow-hidden transition-all duration-700 ease-in-out ${
                showQA ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
              }`}>
                {(() => {
                  const latestQA = getLatestQA();
                  const latestBind = branchBinds && branchBinds.length > 0 ? branchBinds[branchBinds.length - 1] : null;
                  return latestQA && latestBind ? (
                    <div className={`text-xs ${isDark ? "text-purple-400" : "text-indigo-500"} bg-black/10 rounded-lg p-2 transform transition-transform duration-700 ease-in-out ${
                      showQA ? 'translate-y-0' : '-translate-y-2'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Latest Bind:</span>
                        <span className="text-xs opacity-75">ID: {truncateText(latestBind.id, 12)}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400">Q:</span>
                        <span className="flex-1">{latestQA.question}</span>
                      </div>
                      <div className="flex items-start gap-2 mt-1">
                        <span className="text-green-400">A:</span>
                        <span className="flex-1">{latestQA.answer}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        )}
      
      {isInResponseMode ? (
        <div
          className="flex-1 overflow-y-auto flex flex-col justify-between items-center min-h-0 w-full"
          tabIndex={0} // Make div focusable
          onKeyDown={(e) => { // Add keyboard handler directly to response div
            if (e.key === 'Enter' && !e.shiftKey) {
              // Check if user is interacting with buttons
              const isClickingButton = (e.target as HTMLElement)?.closest('button');
              if (!isClickingButton) {
                console.log("Enter key pressed in response div");
                // Add delay to allow button interactions to complete
                setTimeout(() => {
                  returnToInputState();
                }, 200);
              }
            }
          }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className={`jellyfish-loader ${isDark ? 'dark' : 'light'}`}>
                <div className="jellyfish">
                  <div className="jellyfish-bell"></div>
                  <div className="jellyfish-tentacles">
                    <div className="tentacle"></div>
                    <div className="tentacle"></div>
                    <div className="tentacle"></div>
                    <div className="tentacle"></div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isDark
                    ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30"
                    : "bg-red-500/20 hover:bg-red-500/30 text-red-600 border-red-500/30"
                } backdrop-blur-sm border`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div
              className="w-full flex flex-col items-center flex-1 relative"
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
              <div className={`prose prose-sm lg:prose-lg max-w-none w-full ${isDark ? 'text-white' : 'text-gray-900'} overflow-y-auto max-h-[60vh] text-center pt-8 pb-48 px-4`}>
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
            </div>
          )}
        </div>
      ) : (
        /* Input Mode */
        <div className={`flex-1 flex flex-col min-h-0 items-center justify-evenly`}>
          {/* Attachment preview - positioned at top center */}
          {attachment && (
            <div className="p-4 flex justify-center">
              <div className="p-2 bg-black/10 rounded-lg">
                <div className="relative inline-block">
                  <img src={attachment.preview} alt="preview" className="h-24 w-24 object-cover rounded-md" />
                  <button
                    onClick={() => setAttachment(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Main input area - centered position */}
          <div className="flex-1 flex items-center justify-center px-4 mb-6">
            <div className="w-full max-w-2xl text-center">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  messages.length === 0
                    ? ConversationStore.isRedPillModel(selectedModel)
                      ? "Start a private conversation..."
                      : "Ask me anything..."
                    : "Reply..."
                }
                className={`w-full resize-none outline-none transition-all duration-500 ${
                  isDark
                    ? "bg-transparent text-white placeholder-gray-400"
                    : "bg-transparent text-gray-900 placeholder-gray-600"
                } text-base lg:text-lg leading-relaxed text-center`}
                style={{ minHeight: '60px', maxHeight: '120px' }}
                rows={1}
                autoFocus
                id="chat-input-textarea"
              />
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
          </div>
          
          {/* Action buttons - moved down, positioned in the middle horizontally */}
          <div className="px-4 flex justify-center mb-6">
            <div className="flex items-center gap-2">
              {ConversationStore.getAvailableModels().find(m => m.id === selectedModel)?.supportsAttachments && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach an image (PNG, JPG, etc.)"
                  className={`p-2 lg:p-3 rounded-full transition-all duration-300 ${
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-black/10 hover:bg-black/20 text-black"
                  }`}
                >
                  <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && !attachment)}
                className={`p-2 lg:p-3 rounded-full transition-all duration-300 ${
                  isDark
                    ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                    : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
                } backdrop-blur-sm border disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 lg:rounded-lg lg:px-4 lg:py-2`}
              >
                <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline ml-2 text-sm font-medium">Send</span>
              </button>
            </div>
          </div>
          
          {/* Input hints and controls - moved down to the very bottom, centered */}
          <div className="px-4 pb-1 flex justify-center mt-4">
            <div className="w-full max-w-2xl flex items-center justify-center gap-4 text-xs lg:text-sm">
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
          </div>
          
          {/* Context Preview */}
          <ContextPreview
            isOpen={showContextPreview}
            content={contextPreviewContent}
            isDark={isDark}
            onContentChange={(content) => {
              setContextPreviewContent(content);
              setIsContextEdited(true);
              // If we're in response mode, also update the current response
              // This makes context edits equivalent to response edits
              if (isInResponseMode && currentResponse) {
                // Parse the edited context to extract just the AI response part
                // The context typically contains the conversation history + current response
                // We need to extract just the response portion
                const lines = content.split('\n');
                let responseStartIndex = -1;
                
                // Look for the last "Assistant:" or similar marker
                for (let i = lines.length - 1; i >= 0; i--) {
                  if (lines[i].includes('Assistant:') || lines[i].includes('**Assistant:**')) {
                    responseStartIndex = i + 1;
                    break;
                  }
                }
                
                if (responseStartIndex !== -1 && responseStartIndex < lines.length) {
                  // Extract everything after the last Assistant marker
                  const responseLines = lines.slice(responseStartIndex);
                  const extractedResponse = responseLines.join('\n').trim();
                  
                  // Only update if we found a meaningful response
                  if (extractedResponse && extractedResponse !== currentResponse && onUpdateCurrentResponse) {
                    onUpdateCurrentResponse(extractedResponse);
                  }
                }
              }
            }}
            onClose={() => setShowContextPreview(false)}
            onReset={() => {
              const previewContent = generateContextPreview();
              setContextPreviewContent(previewContent);
              setIsContextEdited(false);
            }}
          />
        </div>
      )}
      </LiquidGlassWrapper>
    </div>
  )
}