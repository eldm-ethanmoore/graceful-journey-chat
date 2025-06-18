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
  handlePinConversation
}: ChatInterfaceProps) => {
  return (
    <div className={`transition-all duration-300 ${showSettings ? 'h-[30vh] mt-6' : 'h-[41vh]'}`}>
      <LiquidGlassWrapper
        className="chat-box rounded-2xl p-4 lg:p-6 overflow-hidden flex flex-col min-h-0 w-full h-full items-center justify-center"
        isDark={isDark}
      >
      
      {isInResponseMode ? (
        <div
          className="flex-1 overflow-y-auto flex flex-col justify-between items-center min-h-0 w-full"
          tabIndex={0} // Make div focusable
          onKeyDown={(e) => { // Add keyboard handler directly to response div
            if (e.key === 'Enter' && !e.shiftKey) {
              console.log("Enter key pressed in response div");
              returnToInputState();
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
              className="w-full flex flex-col items-center flex-1"
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
              <div className={`prose prose-sm lg:prose-lg max-w-none w-full ${isDark ? 'text-white' : 'text-gray-900'} overflow-y-auto max-h-[60vh] text-center`}>
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
              
              {/* Response Actions - positioned at bottom center */}
              <div className="mt-4 lg:mt-6 pt-4 border-t border-gray-500/20 flex justify-center gap-3">
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
                  } backdrop-blur-sm hover:scale-105 active:scale-95`}
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
                    } backdrop-blur-sm hover:scale-105 active:scale-95`}
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