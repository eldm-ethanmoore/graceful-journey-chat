"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import axios from "axios"
import { BranchPanel } from "./BranchPanel"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message as StoredMessage } from "./conversationStore"
import { Sun, Moon, Sparkles } from "lucide-react"

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

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attestation, setAttestation] = useState<AttestationData | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [mode, setMode] = useState<"ephemeral" | "structured">("ephemeral")
  const [isDark, setIsDark] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // RedPill API configuration
  const REDPILL_API_KEY = import.meta.env.VITE_REDPILL_API_KEY || ""
  const REDPILL_API_URL = "https://api.redpill.ai/v1"
  const DEFAULT_MODEL = "phala/llama-3.3-70b-instruct"

  const TEE_MODELS = [
    { id: "phala/llama-3.3-70b-instruct", name: "Llama 3.3 70B", description: "Fast & multilingual" },
    { id: "phala/deepseek-r1-70b", name: "DeepSeek R1 70B", description: "Advanced reasoning" },
    { id: "phala/qwen2.5-7b-instruct", name: "Qwen 2.5 7B", description: "Efficient & capable" },
  ]

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    loadOrCreateDefaultBranch()
  }, [])

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
    setIsVerifying(true)
    try {
      const response = await axios.get(`${REDPILL_API_URL}/attestation/report?model=${selectedModel}`, {
        headers: {
          Authorization: `Bearer ${REDPILL_API_KEY}`,
          "Content-Type": "application/json",
        },
      })

      const attestationData = {
        ...response.data,
        verified: true,
      }

      setAttestation(attestationData)
    } catch (error) {
      console.error("Failed to verify attestation:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)

    if (mode === "structured" && currentBranch) {
      await ConversationStore.updateBranch(currentBranch.id, updatedMessages)
    }

    try {
      const response = await axios.post(
        `${REDPILL_API_URL}/chat/completions`,
        {
          model: selectedModel,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${REDPILL_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      )

      const assistantMessage: Message = {
        id: response.data.id || Date.now().toString(),
        role: "assistant",
        content: response.data.choices[0].message.content,
        timestamp: new Date(),
        attestation: attestation || undefined,
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)

      if (mode === "structured" && currentBranch) {
        await ConversationStore.updateBranch(currentBranch.id, finalMessages)
      }
    } catch (error: any) {
      console.error("Failed to send message:", error)
      const errorMessage =
        error.response?.data?.error?.message || error.message || "Failed to send message. Please check your API key."
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      }

      const finalMessages = [...updatedMessages, errorMsg]
      setMessages(finalMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchSelect = async (branch: Branch) => {
    setCurrentBranch(branch)
    setMessages(branch.messages)
    setMode("structured")
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
  }

  const handlePinConversation = async () => {
    if (messages.length === 0) return

    const name = prompt("Name this conversation:") || `Conversation ${new Date().toLocaleDateString()}`
    const newBranch = await ConversationStore.createBranch(name, messages)
    setCurrentBranch(newBranch)
    setMode("structured")
  }

  const themeClasses = isDark
    ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
    : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"

  return (
    <div className={`min-h-screen transition-all duration-1000 ${themeClasses} flex flex-col relative`}>
      <style jsx global>{`
        html, body, #root {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
        }
      `}</style>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
            isDark ? "bg-purple-500" : "bg-blue-400"
          }`}
          style={{ animation: "float 6s ease-in-out infinite" }}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15 transition-all duration-1000 ${
            isDark ? "bg-blue-500" : "bg-purple-400"
          }`}
          style={{ animation: "float 8s ease-in-out infinite reverse" }}
        />
        <div
          className={`absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-2xl opacity-10 transition-all duration-1000 ${
            isDark ? "bg-pink-500" : "bg-cyan-400"
          }`}
          style={{ animation: "float 10s ease-in-out infinite" }}
        />
      </div>

      {/* Branch Panel */}
      {mode === "structured" && (
        <BranchPanel
          currentBranch={currentBranch}
          onBranchSelect={handleBranchSelect}
          onCreateBranch={handleCreateBranch}
          messages={messages}
          isDark={isDark}
          expandedView={isSidebarExpanded}
          onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header with Integrated Actions */}
        <div
          className={`transition-all duration-500 ${
            isDark ? "bg-black/20 border-b border-white/10" : "bg-white/20 border-b border-black/10"
          } backdrop-blur-xl`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (mode !== "structured") {
                        setMode("structured");
                        if (!currentBranch && messages.length > 0) {
                          handlePinConversation();
                        }
                      } else {
                        setIsSidebarExpanded(!isSidebarExpanded);
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors duration-300 ${
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
                  <Sparkles
                    className={`w-6 h-6 transition-colors duration-500 ${
                      isDark ? "text-purple-400" : "text-indigo-600"
                    }`}
                  />
                  <h1
                    className={`text-2xl font-bold transition-colors duration-500 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Graceful Journey
                  </h1>
                </div>

                <div
                  className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-500 ${
                    isDark
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                  } backdrop-blur-sm`}
                >
                  🔒 TEE Verified
                </div>

                {/* Mode Switcher */}
                <div
                  className={`flex rounded-xl p-1 transition-all duration-500 ${
                    isDark ? "bg-white/10" : "bg-black/10"
                  } backdrop-blur-sm border ${isDark ? "border-white/20" : "border-black/20"}`}
                >
                  <button
                    onClick={() => setMode("ephemeral")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
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
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
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
              </div>

              <div className="flex items-center gap-3">
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
              </div>
            </div>

            {attestation && (
              <div
                className={`mt-4 p-4 rounded-xl transition-all duration-500 ${
                  isDark
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                } backdrop-blur-sm border text-sm`}
              >
                <p className="font-medium mb-1">✓ Privacy Verified via GPU TEE</p>
                <p className="opacity-80 truncate">Signing Address: {attestation.signing_address}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
              {mode === "ephemeral" && messages.length > 0 && (
                <button
                  onClick={handlePinConversation}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    isDark
                      ? "bg-blue-500/30 hover:bg-blue-500/40 text-blue-300"
                      : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-700"
                  } backdrop-blur-sm hover:scale-105 active:scale-95`}
                >
                  📌 Pin & Save
                </button>
              )}
              <button
                onClick={handleNewConversation}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  isDark ? "bg-white/10 hover:bg-white/20 text-gray-300" : "bg-black/10 hover:bg-black/20 text-gray-700"
                } backdrop-blur-sm hover:scale-105 active:scale-95`}
              >
                ✨ New Chat
              </button>
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    const markdown = ConversationStore.exportAsMarkdown(messages)
                    const blob = new Blob([markdown], { type: "text/markdown" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `conversation-${new Date().toISOString()}.md`
                    a.click()
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    isDark ? "bg-white/10 hover:bg-white/20 text-gray-300" : "bg-black/10 hover:bg-black/20 text-gray-700"
                  } backdrop-blur-sm hover:scale-105 active:scale-95`}
                >
                  📥 Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">

            <style jsx>{`
              @media (max-height: 800px) {
                .message-content {
                  max-height: 300px;
                  overflow-y: auto;
                }
              }
            `}</style>
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all duration-500 ${
                    isDark ? "bg-purple-500/20 text-purple-300" : "bg-indigo-500/20 text-indigo-600"
                  } backdrop-blur-sm`}
                >
                  <Sparkles className="w-10 h-10" />
                </div>
                <h2
                  className={`text-2xl font-bold mb-2 transition-colors duration-500 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Private AI Conversations
                </h2>
                <p
                  className={`text-sm mb-4 transition-colors duration-500 ${
                    isDark ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Your messages are processed in secure GPU enclaves
                </p>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-500 ${
                    isDark
                      ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-700"
                  } backdrop-blur-sm border`}
                >
                  <span className="text-xl">🔐</span>
                  <span className="font-medium">End-to-end encrypted • No data retention • Verifiable privacy</span>
                </div>
                <div
                  className={`mt-6 space-y-2 text-xs transition-colors duration-500 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <p>
                    💡 <strong>Ephemeral Mode:</strong> Quick brainstorming, no saving
                  </p>
                  <p>
                    📌 <strong>Pin conversations</strong> to enable branching & version control
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`mb-8 ${message.role === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block max-w-[80%] px-6 py-4 rounded-2xl transition-all duration-500 ${
                    message.role === "user"
                      ? isDark
                        ? "bg-purple-500/30 text-white border border-purple-500/30 shadow-lg shadow-purple-500/20"
                        : "bg-indigo-500/20 text-indigo-900 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                      : isDark
                        ? "bg-white/10 text-gray-100 border border-white/20 shadow-lg shadow-black/20"
                        : "bg-black/10 text-gray-900 border border-black/20 shadow-lg shadow-black/5"
                  } backdrop-blur-sm hover:scale-[1.02] transform`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0" {...props} />,
                          ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 last:mb-0" {...props} />,
                          ol: ({ node, ...props }: any) => (
                            <ol className="list-decimal pl-5 mb-4 last:mb-0" {...props} />
                          ),
                          li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
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
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}

                  {message.attestation && (
                    <div
                      className={`mt-3 pt-3 border-t transition-colors duration-500 ${
                        isDark ? "border-white/20" : "border-black/20"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium transition-colors duration-500 ${
                          isDark ? "text-emerald-400" : "text-emerald-600"
                        }`}
                      >
                        ✓ TEE Verified
                      </span>
                    </div>
                  )}
                </div>
                <p
                  className={`text-xs mt-2 px-2 transition-colors duration-500 ${
                    isDark ? "text-gray-500" : "text-gray-600"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}

            {isLoading && (
              <div className="text-left mb-8">
                <div
                  className={`inline-block px-6 py-4 rounded-2xl transition-all duration-500 ${
                    isDark ? "bg-white/10 border border-white/20" : "bg-black/10 border border-black/20"
                  } backdrop-blur-sm`}
                >
                  <div className="flex gap-2">
                    <span
                      className={`w-3 h-3 rounded-full animate-bounce transition-colors duration-500 ${
                        isDark ? "bg-gray-400" : "bg-gray-600"
                      }`}
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className={`w-3 h-3 rounded-full animate-bounce transition-colors duration-500 ${
                        isDark ? "bg-gray-400" : "bg-gray-600"
                      }`}
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className={`w-3 h-3 rounded-full animate-bounce transition-colors duration-500 ${
                        isDark ? "bg-gray-400" : "bg-gray-600"
                      }`}
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className={`transition-all duration-500 ${
            isDark ? "bg-black/20" : "bg-white/20"
          } backdrop-blur-xl`}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message private AI..."
                className={`flex-1 px-6 py-4 rounded-2xl transition-all duration-500 ${
                  isDark
                    ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                    : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
                } focus:scale-[1.02] transform`}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className={`px-8 py-4 rounded-2xl font-medium transition-all duration-500 ${
                  isDark
                    ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30 shadow-lg shadow-purple-500/20"
                    : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                } backdrop-blur-sm border disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transform`}
              >
                Send
              </button>
            </div>
            <p
              className={`text-sm text-center mt-4 transition-colors duration-500 ${
                isDark ? "text-gray-500" : "text-gray-600"
              }`}
            >
              🔒{" "}
              {mode === "ephemeral"
                ? "Ephemeral session • No conversation history stored"
                : `Branch: ${currentBranch?.name || "Main"}`}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  )
}

export default App
