import { useState, useEffect } from "react"
import { X, Key } from "lucide-react"

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (keys: { redpill: string; openrouter: string }) => void
  isDark: boolean
  initialRedPillKey: string | null
  initialOpenRouterKey: string | null
}

export const ApiKeyModal = ({
  isOpen,
  onClose,
  onSave,
  isDark,
  initialRedPillKey,
  initialOpenRouterKey,
}: ApiKeyModalProps) => {
  const [redPillApiKey, setRedPillApiKey] = useState("")
  const [openRouterApiKey, setOpenRouterApiKey] = useState("")

  useEffect(() => {
    if (isOpen) {
      setRedPillApiKey(initialRedPillKey || "")
      setOpenRouterApiKey(initialOpenRouterKey || "")
    }
  }, [isOpen, initialRedPillKey, initialOpenRouterKey])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ redpill: redPillApiKey, openrouter: openRouterApiKey })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl transition-all duration-300 ${
          isDark ? "bg-[#333333] text-white" : "bg-white text-gray-900"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">API Keys</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${isDark ? "hover:bg-[#444444]" : "hover:bg-gray-100"}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              RedPill API Key
            </label>
            <input
              type="password"
              value={redPillApiKey}
              onChange={(e) => setRedPillApiKey(e.target.value)}
              placeholder="sk-..."
              className={`w-full px-4 py-3 rounded-lg border text-base ${
                isDark
                  ? "bg-[#444444] border-[#555555] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              autoFocus
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={openRouterApiKey}
              onChange={(e) => setOpenRouterApiKey(e.target.value)}
              placeholder="sk-or-..."
              className={`w-full px-4 py-3 rounded-lg border text-base ${
                isDark
                  ? "bg-[#444444] border-[#555555] text-white"
                  : "bg-white border-gray-300 text-gray-900"
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                isDark
                  ? "bg-[#444444] hover:bg-[#555555] text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Save Keys
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}