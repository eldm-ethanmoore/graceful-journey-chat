import React from "react";
import { X } from "lucide-react";

interface ContextPreviewProps {
  isOpen: boolean;
  content: string;
  isDark: boolean;
  onContentChange: (content: string) => void;
  onClose: () => void;
  onReset: () => void;
}

export const ContextPreview: React.FC<ContextPreviewProps> = ({
  isOpen,
  content,
  isDark,
  onContentChange,
  onClose,
  onReset
}) => {
  if (!isOpen) return null;
  
  return (
    <div className={`mt-4 p-4 rounded-xl transition-all duration-500 ${
      isDark ? "bg-[#333333]/60 border-[#2ecc71]/30" : "bg-[#f0f8ff]/60 border-[#54ad95]/30"
    } backdrop-blur-xl border`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
          Context Preview (Sent to LLM)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className={`px-2 py-1 text-xs rounded transition-all duration-300 ${
              isDark
                ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4]"
                : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95]"
            }`}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${isDark ? 'hover:bg-[#444444]' : 'hover:bg-gray-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        className={`w-full h-64 p-3 rounded-lg text-sm font-mono resize-none ${
          isDark 
            ? 'bg-[#444444] border-[#555555] text-white' 
            : 'bg-white border-gray-300 text-gray-900'
        } border focus:outline-none focus:ring-2 ${
          isDark ? "focus:ring-[#2ecc71]/50" : "focus:ring-[#54ad95]/50"
        }`}
      />
      <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        Edit the context above to customize what's sent to the LLM. Use Markdown format.
      </p>
    </div>
  );
};