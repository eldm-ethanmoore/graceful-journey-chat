"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ConversationStore } from "../conversationStore"
import type { Branch, Bind, PinnedBind, Message, Idea } from "../conversationStore"
import { Plus, Search, GitBranch, Pencil, Trash2, Check, X, Pin, PinOff, ChevronDown, ChevronRight, Merge, Eye, Folder, FolderOpen } from "lucide-react"

interface TreeNavigationPanelProps {
  currentBranch: Branch | null
  onBranchSelect: (branch: Branch) => void
  onCreateBranch: (name: string) => void
  isDark: boolean
  expandedView: boolean
  onClose: () => void
  mode: "ephemeral" | "structured"
  setMode: (mode: "ephemeral" | "structured") => void | Promise<void>
  apiKey: string | null
  openRouterApiKey: string | null
  handleLogout: () => void
  setShowApiKeyModal: (show: boolean) => void
  handlePinConversation: () => void
  messages: any[]
}

export function TreeNavigationPanel({
  currentBranch,
  onBranchSelect,
  onCreateBranch: onCreateIdea,
  isDark,
  expandedView,
  onClose,
  mode,
  setMode,
  apiKey,
  openRouterApiKey,
  handleLogout,
  setShowApiKeyModal,
  handlePinConversation,
  messages
}: TreeNavigationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [binds, setBinds] = useState<Bind[]>([])
  const [pinnedBinds, setPinnedBinds] = useState<PinnedBind[]>([])
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false)
  const [newIdeaName, setNewIdeaName] = useState("")
  const [newIdeaDescription, setNewIdeaDescription] = useState("")
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null)
  const [editingIdeaName, setEditingIdeaName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set())
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [selectedBinds, setSelectedBinds] = useState<Set<string>>(new Set())
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (expandedView) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedView, onClose]);

  const loadData = useCallback(async () => {
    try {
      const [allIdeas, allBranches, allBinds, allPinnedBinds] = await Promise.all([
        ConversationStore.getAllIdeas(),
        ConversationStore.getAllBranches(),
        ConversationStore.getAllBinds(),
        ConversationStore.getPinnedBinds()
      ])
      setIdeas(allIdeas)
      setBranches(allBranches)
      setBinds(allBinds)
      setPinnedBinds(allPinnedBinds)
    } catch (error) {
      console.error("Failed to load data:", error)
      // Set empty arrays as fallback
      setIdeas([])
      setBranches([])
      setBinds([])
      setPinnedBinds([])
    }
  }, [])

  useEffect(() => {
    ConversationStore.listenForChanges(loadData);
    loadData();
    
    return () => {
      ConversationStore.removeListener(loadData);
    };
  }, [loadData])

  const handleCreateIdea = async () => {
    if (newIdeaName.trim()) {
      try {
        await onCreateIdea(newIdeaName.trim())
        setNewIdeaName("")
        setNewIdeaDescription("")
        setShowNewIdeaDialog(false)
        loadData()
      } catch (error) {
        console.error("Failed to create idea:", error)
        alert("Failed to create idea. Please try again.")
      }
    }
  }

  const handleRenameIdea = async (ideaId: string) => {
    if (editingIdeaName.trim()) {
      try {
        await ConversationStore.updateIdea(ideaId, { name: editingIdeaName.trim() });
        setEditingIdeaId(null);
        setEditingIdeaName("");
        loadData();
      } catch (error) {
        console.error("Failed to rename idea:", error)
        alert("Failed to rename idea. Please try again.")
      }
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (window.confirm("Are you sure you want to delete this idea and all its branches? This action cannot be undone.")) {
      try {
        await ConversationStore.deleteIdea(ideaId);
        loadData();
        // If current branch belongs to deleted idea, switch to another idea
        if (currentBranch && currentBranch.ideaId === ideaId) {
          const remainingIdeas = await ConversationStore.getAllIdeas();
          if (remainingIdeas.length > 0) {
            const firstIdea = remainingIdeas[0];
            const ideaBranches = await ConversationStore.getIdeaBranches(firstIdea.id);
            if (ideaBranches.length > 0) {
              onBranchSelect(ideaBranches[0]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to delete idea:", error)
        alert("Failed to delete idea. Please try again.")
      }
    }
  };

  const toggleIdeaExpansion = (ideaId: string) => {
    const newExpanded = new Set(expandedIdeas)
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId)
    } else {
      newExpanded.add(ideaId)
    }
    setExpandedIdeas(newExpanded)
  }

  const toggleBranchExpansion = (branchId: string) => {
    const newExpanded = new Set(expandedBranches)
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId)
    } else {
      newExpanded.add(branchId)
    }
    setExpandedBranches(newExpanded)
  }

  const toggleBindPin = async (bindId: string) => {
    try {
      await ConversationStore.toggleBindPin(bindId)
      loadData()
    } catch (error) {
      console.error("Failed to toggle bind pin:", error)
      alert("Failed to pin/unpin bind. Please try again.")
    }
  }

  const toggleBindSelection = (bindId: string) => {
    const newSelected = new Set(selectedBinds)
    if (newSelected.has(bindId)) {
      newSelected.delete(bindId)
    } else {
      newSelected.add(bindId)
    }
    setSelectedBinds(newSelected)
  }

  const getIdeaBranches = (ideaId: string) => {
    return branches.filter(branch => branch.ideaId === ideaId)
  }

  const getBranchBinds = (branchId: string) => {
    return binds.filter(bind => bind.branchId === branchId)
  }

  // Helper function to extract text content from Message objects
  const getMessageContent = (message: Message): string => {
    if (typeof message.content === 'string') {
      return message.content;
    } else if (Array.isArray(message.content)) {
      return message.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join(' ');
    }
    return '';
  };

  // Helper function to check if a bind matches the search query
  const bindMatchesQuery = (bind: Bind, query: string): boolean => {
    const summaryMatch = bind.summary?.toLowerCase().includes(query);
    const userContent = getMessageContent(bind.userPrompt).toLowerCase();
    const aiContent = getMessageContent(bind.aiResponse).toLowerCase();
    const userPromptMatch = userContent.includes(query);
    const aiResponseMatch = aiContent.includes(query);
    
    return summaryMatch || userPromptMatch || aiResponseMatch;
  };

  const filteredIdeas = ideas.filter(idea => {
    if (searchQuery.trim() === "") return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Check idea name and description
    if (idea.name.toLowerCase().includes(query)) return true;
    if (idea.description?.toLowerCase().includes(query)) return true;
    
    // Check if any branches in this idea match
    const ideaBranches = getIdeaBranches(idea.id);
    const branchMatches = ideaBranches.some(branch => {
      if (branch.name.toLowerCase().includes(query)) return true;
      
      // Check if any binds in this branch match
      const branchBinds = getBranchBinds(branch.id);
      return branchBinds.some(bind => bindMatchesQuery(bind, query));
    });
    
    return branchMatches;
  })

  const renderBindPreview = (bind: Bind) => {
    const isPinned = pinnedBinds.some(pb => pb.bindId === bind.id)
    const isSelected = selectedBinds.has(bind.id)
    
    return (
      <div
        key={bind.id}
        className={`ml-8 p-2 rounded-lg text-xs transition-all duration-300 ${
          isSelected
            ? isDark
              ? "bg-blue-500/30 border-blue-500/50"
              : "bg-blue-500/20 border-blue-500/40"
            : isDark
              ? "bg-white/5 hover:bg-white/10 border-white/10"
              : "bg-black/5 hover:bg-black/10 border-black/10"
        } backdrop-blur-sm border cursor-pointer`}
        onClick={() => toggleBindSelection(bind.id)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
            Bind #{bind.id.slice(-4)}
          </span>
          <div className="flex items-center gap-1">
            {isPinned && <Pin className="w-3 h-3 text-yellow-500" />}
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleBindPin(bind.id)
              }}
              className={`p-1 rounded ${isDark ? 'hover:bg-white/20' : 'hover:bg-black/20'}`}
              title={isPinned ? "Unpin bind" : "Pin bind"}
            >
              {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (window.confirm("Are you sure you want to delete this bind? This action cannot be undone.")) {
                  await ConversationStore.deleteBind(bind.id)
                  loadData()
                }
              }}
              className={`p-1 rounded ${isDark ? 'hover:bg-red-500/30' : 'hover:bg-red-500/20'}`}
              title="Delete bind"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        </div>
        
        {isSelected ? (
          // Expanded view when selected - show full content
          <div className="space-y-2">
            <div className={`${isDark ? "text-blue-300" : "text-blue-700"} font-medium`}>
              User Question:
            </div>
            <p className={`${isDark ? "text-gray-300" : "text-gray-700"} text-xs leading-relaxed pl-2 border-l-2 ${isDark ? "border-blue-500/50" : "border-blue-500/30"}`}>
              {getMessageContent(bind.userPrompt).substring(0, 300)}
              {getMessageContent(bind.userPrompt).length > 300 && '...'}
            </p>
            
            <div className={`${isDark ? "text-green-300" : "text-green-700"} font-medium`}>
              AI Response:
            </div>
            <p className={`${isDark ? "text-gray-300" : "text-gray-700"} text-xs leading-relaxed pl-2 border-l-2 ${isDark ? "border-green-500/50" : "border-green-500/30"}`}>
              {getMessageContent(bind.aiResponse).substring(0, 400)}
              {getMessageContent(bind.aiResponse).length > 400 && '...'}
            </p>
          </div>
        ) : (
          // Collapsed view when not selected - show summary
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"} line-clamp-2`}>
            {bind.summary}
          </p>
        )}
        
        <div className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
          {bind.createdAt.toLocaleDateString()} • {bind.isLocked ? "Locked" : "Unlocked"}
        </div>
      </div>
    )
  }

  const renderBranch = (branch: Branch) => {
    const isExpanded = expandedBranches.has(branch.id)
    const branchBinds = getBranchBinds(branch.id)
    const isCurrentBranch = currentBranch?.id === branch.id

    return (
      <div key={branch.id} className="ml-4">
        <div
          className={`p-2 rounded-lg transition-all duration-300 group cursor-pointer ${
            isCurrentBranch
              ? isDark
                ? "bg-green-500/30 border-green-500/50"
                : "bg-green-500/20 border-green-500/40"
              : isDark
                ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                : "bg-black/5 hover:bg-black/10 border-black/10 hover:border-black/20"
          } backdrop-blur-sm border`}
          onClick={() => onBranchSelect(branch)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleBranchExpansion(branch.id)
                }}
                className={`p-1 rounded ${isDark ? 'hover:bg-white/20' : 'hover:bg-black/20'}`}
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              <GitBranch className="w-3 h-3" />
              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                {branch.name}
              </span>
              {branch.isMerged && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDark ? "bg-green-500/20 text-green-400" : "bg-green-500/10 text-green-600"
                }`}>
                  Merged
                </span>
              )}
            </div>
          </div>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {branchBinds.length} binds • {branch.createdAt.toLocaleDateString()}
            {!branch.isLinear && " • Branched"}
          </p>
        </div>
        
        {/* Render binds if expanded */}
        {isExpanded && branchBinds.length > 0 && (
          <div className="mt-1 space-y-1">
            {branchBinds.map(renderBindPreview)}
          </div>
        )}
      </div>
    )
  }

  const renderIdea = (idea: Idea) => {
    const isExpanded = expandedIdeas.has(idea.id)
    const ideaBranches = getIdeaBranches(idea.id)
    const totalBinds = ideaBranches.reduce((sum, branch) => sum + getBranchBinds(branch.id).length, 0)
    const hasCurrentBranch = currentBranch && ideaBranches.some(branch => branch.id === currentBranch.id)

    return (
      <div key={idea.id} className="mb-2">
        {editingIdeaId === idea.id ? (
          <div className={`p-3 rounded-xl ${isDark ? "bg-yellow-500/20 border-yellow-500/30" : "bg-yellow-500/10 border-yellow-500/20"} backdrop-blur-sm border`}>
            <input
              type="text"
              value={editingIdeaName}
              onChange={(e) => setEditingIdeaName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRenameIdea(idea.id)}
              className={`w-full px-3 py-2 rounded-md text-sm mb-2 ${
                isDark ? "bg-black/50 border-white/20 text-white" : "bg-white/50 border-black/20 text-black"
              }`}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => handleRenameIdea(idea.id)} className={`p-2 rounded-md ${isDark ? 'bg-green-500/30 hover:bg-green-500/40' : 'bg-green-500/20 hover:bg-green-500/30'}`}>
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingIdeaId(null)} className={`p-2 rounded-md ${isDark ? 'bg-red-500/30 hover:bg-red-500/40' : 'bg-red-500/20 hover:bg-red-500/30'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`p-3 rounded-xl transition-all duration-300 group cursor-pointer ${
                hasCurrentBranch
                  ? isDark
                    ? "bg-purple-500/30 border-purple-500/50 shadow-lg shadow-purple-500/20"
                    : "bg-indigo-500/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                  : isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                    : "bg-black/5 hover:bg-black/10 border-black/10 hover:border-black/20"
              } backdrop-blur-sm border`}
              onClick={() => toggleIdeaExpansion(idea.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {idea.name}
                  </span>
                  {idea.isPinned && <Pin className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingIdeaId(idea.id)
                      setEditingIdeaName(idea.name)
                    }}
                    className={`p-1 rounded-md ${isDark ? 'hover:bg-white/20' : 'hover:bg-black/20'}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteIdea(idea.id)
                    }}
                    className={`p-1 rounded-md ${isDark ? 'hover:bg-red-500/30' : 'hover:bg-red-500/20'}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {ideaBranches.length} branches • {totalBinds} binds • {idea.createdAt.toLocaleDateString()}
              </p>
              {idea.description && (
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"} italic`}>
                  {idea.description}
                </p>
              )}
            </div>
            
            {/* Render branches if expanded */}
            {isExpanded && ideaBranches.length > 0 && (
              <div className="mt-2 space-y-1">
                {ideaBranches.map(renderBranch)}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (!expandedView) return null

  return (
    <div
      ref={panelRef}
      className={`fixed inset-y-0 left-0 z-50 w-80 ${
        isDark ? 'bg-black/90' : 'bg-white/95'
      } backdrop-blur-xl border-r ${
        isDark ? 'border-white/10' : 'border-black/10'
      } transform transition-transform duration-300 ease-in-out translate-x-0`}
    >
      <div className="p-6 h-full flex flex-col">
        <h3 className={`text-sm font-bold mb-6 ${isDark ? "text-gray-400" : "text-gray-600"} tracking-wider uppercase`}>
          {mode === "ephemeral" ? "Ephemeral Session" : "Idea Explorer"}
        </h3>

        {/* Pinned Binds Section */}
        {pinnedBinds.length > 0 && (
          <div className="mb-6">
            <h4 className={`text-xs font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"} uppercase tracking-wider`}>
              📌 Pinned Binds
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pinnedBinds.map(pinnedBind => {
                const bind = binds.find(b => b.id === pinnedBind.bindId)
                return bind ? renderBindPreview(bind) : null
              })}
            </div>
          </div>
        )}

        {/* Mode Switcher - Mobile Only */}
        <div className="mb-6 lg:hidden">
          <h4 className={`text-xs font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"} uppercase tracking-wider`}>
            Mode
          </h4>
          <div className={`flex rounded-xl p-1 ${
            isDark ? "bg-[#333333]/60" : "bg-[#f0f8ff]/60"
          } backdrop-blur-sm border ${isDark ? "border-[#2ecc71]/30" : "border-[#0088fb]/30"}`}>
            <button
              onClick={() => setMode("ephemeral")}
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
        </div>

        {/* Login/Logout - Mobile Only */}
        <div className="mb-6 lg:hidden">
          <h4 className={`text-xs font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"} uppercase tracking-wider`}>
            Authentication
          </h4>
          {apiKey || openRouterApiKey ? (
            <button
              onClick={handleLogout}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                isDark
                  ? "bg-red-500/30 hover:bg-red-500/40 text-red-300 border-[#54ad95]/30"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-700 border-[#0088fb]/30"
              } backdrop-blur-sm border`}
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setShowApiKeyModal(true)}
              className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                isDark
                  ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                  : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
              } backdrop-blur-sm border`}
            >
              Login with API Key
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas, branches & binds..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm ${
                isDark
                  ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                  : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
              } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
              }`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {mode === "structured" && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setShowNewIdeaDialog(true)}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                isDark
                  ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                  : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
              } backdrop-blur-sm border hover:scale-105 active:scale-95 transform flex items-center justify-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              New Idea
            </button>

            {selectedBinds.size > 1 && (
              <button
                onClick={() => setShowMergeDialog(true)}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isDark
                    ? "bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-500/30"
                    : "bg-green-500/20 hover:bg-green-500/30 text-green-700 border-green-500/30"
                } backdrop-blur-sm border hover:scale-105 active:scale-95 transform flex items-center justify-center gap-2`}
              >
                <Merge className="w-4 h-4" />
                Merge Selected ({selectedBinds.size})
              </button>
            )}
          </div>
        )}

        {/* Ideas Tree */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredIdeas.map(renderIdea)}
        </div>

        {/* New Idea Dialog */}
        {showNewIdeaDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`p-8 rounded-2xl w-full max-w-md ${
              isDark ? "bg-gray-900/90 border-white/20" : "bg-white/90 border-black/20"
            } backdrop-blur-xl border shadow-2xl`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                Create New Idea
              </h3>
              <input
                type="text"
                value={newIdeaName}
                onChange={(e) => setNewIdeaName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleCreateIdea()}
                placeholder="Idea name..."
                className={`w-full px-4 py-3 rounded-xl ${
                  isDark
                    ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                    : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
                } mb-4`}
                autoFocus
              />
              <textarea
                value={newIdeaDescription}
                onChange={(e) => setNewIdeaDescription(e.target.value)}
                placeholder="Description (optional)..."
                className={`w-full px-4 py-3 rounded-xl ${
                  isDark
                    ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                    : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
                } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                  isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
                } mb-6 resize-none`}
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateIdea}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isDark
                      ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                      : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                  } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
                >
                  Create Idea
                </button>
                <button
                  onClick={() => {
                    setShowNewIdeaDialog(false)
                    setNewIdeaName("")
                    setNewIdeaDescription("")
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

        {/* Merge Dialog */}
        {showMergeDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`p-8 rounded-2xl w-full max-w-md ${
              isDark ? "bg-gray-900/90 border-white/20" : "bg-white/90 border-black/20"
            } backdrop-blur-xl border shadow-2xl`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                Merge Selected Binds
              </h3>
              <p className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                You have selected {selectedBinds.size} binds to merge. Choose how to merge them:
              </p>
              <div className="space-y-3 mb-6">
                <button
                  onClick={async () => {
                    if (isMerging) return; // Prevent double-click
                    
                    try {
                      setIsMerging(true);
                      if (currentBranch) {
                        await ConversationStore.mergeSelectedBinds(
                          Array.from(selectedBinds),
                          currentBranch.id
                        );
                        setSelectedBinds(new Set());
                        setShowMergeDialog(false);
                        loadData();
                      }
                    } catch (error) {
                      console.error("Failed to merge binds:", error);
                      alert("Failed to merge binds. Please try again.");
                    } finally {
                      setIsMerging(false);
                    }
                  }}
                  disabled={isMerging}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isMerging
                      ? isDark
                        ? "bg-gray-500/30 text-gray-400 border-gray-500/30 cursor-not-allowed"
                        : "bg-gray-500/20 text-gray-600 border-gray-500/30 cursor-not-allowed"
                      : isDark
                        ? "bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-500/30"
                        : "bg-green-500/20 hover:bg-green-500/30 text-green-700 border-green-500/30"
                  } backdrop-blur-sm border ${!isMerging && 'hover:scale-105 active:scale-95'} transform`}
                >
                  {isMerging ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      AI Merging...
                    </div>
                  ) : (
                    "Merge into Current Branch"
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (isMerging) return; // Prevent double-click
                    
                    const newBranchName = prompt("Enter name for new branch:");
                    if (newBranchName && newBranchName.trim() && currentBranch) {
                      try {
                        setIsMerging(true);
                        await ConversationStore.mergeSelectedBinds(
                          Array.from(selectedBinds),
                          currentBranch.id,
                          newBranchName.trim()
                        );
                        setSelectedBinds(new Set());
                        setShowMergeDialog(false);
                        loadData();
                      } catch (error) {
                        console.error("Failed to merge binds:", error);
                        alert("Failed to merge binds. Please try again.");
                      } finally {
                        setIsMerging(false);
                      }
                    }
                  }}
                  disabled={isMerging}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isMerging
                      ? isDark
                        ? "bg-gray-500/30 text-gray-400 border-gray-500/30 cursor-not-allowed"
                        : "bg-gray-500/20 text-gray-600 border-gray-500/30 cursor-not-allowed"
                      : isDark
                        ? "bg-blue-500/30 hover:bg-blue-500/40 text-blue-300 border-blue-500/30"
                        : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 border-blue-500/30"
                  } backdrop-blur-sm border ${!isMerging && 'hover:scale-105 active:scale-95'} transform`}
                >
                  {isMerging ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      AI Merging...
                    </div>
                  ) : (
                    "Create New Branch from Selection"
                  )}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!isMerging) {
                      setShowMergeDialog(false);
                      setSelectedBinds(new Set());
                    }
                  }}
                  disabled={isMerging}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isMerging
                      ? isDark
                        ? "bg-gray-500/30 text-gray-500 border-gray-500/30 cursor-not-allowed"
                        : "bg-gray-500/20 text-gray-500 border-gray-500/30 cursor-not-allowed"
                      : isDark
                        ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                        : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
                  } backdrop-blur-sm border ${!isMerging && 'hover:scale-105 active:scale-95'} transform`}
                >
                  {isMerging ? "Merging..." : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}