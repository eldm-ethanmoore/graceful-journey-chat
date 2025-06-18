import { useState, useEffect } from "react"
import { ConversationStore } from "../conversationStore"
import type { Branch, Message } from "../conversationStore"
import { Plus, Camera, GitBranch } from "lucide-react"

interface MobileBranchPanelProps {
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
}

export const MobileBranchPanel = ({
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
}: MobileBranchPanelProps) => {
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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
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