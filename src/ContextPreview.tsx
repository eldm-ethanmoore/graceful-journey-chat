import React, { useRef, useEffect, useState } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Update line numbers when content changes
  useEffect(() => {
    const lines = content.split('\n').length;
    setLineCount(lines);
  }, [content]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

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
      
      {/* Container for line numbers and textarea */}
      <div className={`relative rounded-lg border ${
        isDark ? 'border-[#555555]' : 'border-gray-300'
      } overflow-hidden`}>
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className={`absolute left-0 top-0 w-12 h-80 overflow-hidden ${
            isDark ? 'bg-[#333333] text-gray-400' : 'bg-gray-50 text-gray-500'
          } border-r ${isDark ? 'border-[#555555]' : 'border-gray-300'} font-mono text-sm leading-5`}
          style={{
            paddingTop: '12px',
            paddingRight: '8px',
            textAlign: 'right',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ height: '20px', lineHeight: '20px' }}>
              {i + 1}
            </div>
          ))}
        </div>
        
        {/* Textarea with left padding for line numbers */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onScroll={handleScroll}
          className={`w-full h-80 text-sm font-mono resize-none ${
            isDark
              ? 'bg-[#444444] text-white'
              : 'bg-white text-gray-900'
          } border-0 focus:outline-none focus:ring-2 ${
            isDark ? "focus:ring-[#2ecc71]/50" : "focus:ring-[#54ad95]/50"
          }`}
          style={{
            paddingLeft: '56px', // 48px for line numbers + 8px spacing
            paddingTop: '12px',
            paddingRight: '12px',
            paddingBottom: '12px',
            lineHeight: '20px'
          }}
        />
      </div>
      
      <p className={`text-xs mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        Edit the context above to customize what's sent to the LLM. Use Markdown format.
      </p>
    </div>
  );
};