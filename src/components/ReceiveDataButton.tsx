import React, { useState, useEffect } from 'react';

interface ReceiveDataButtonProps {
  isDark: boolean;
  isReceiving: boolean;
  onClick: (code: string) => void;
}

/**
 * A button for receiving data via sync with input field
 */
export const ReceiveDataButton: React.FC<ReceiveDataButtonProps> = ({
  isDark,
  isReceiving,
  onClick
}) => {
  const [syncCode, setSyncCode] = useState('');
  const [showInput, setShowInput] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (syncCode.trim()) {
      onClick(syncCode.trim());
      setShowInput(false);
    }
  };

  // Reset input visibility when receiving stops
  useEffect(() => {
    if (!isReceiving) {
      setShowInput(false);
    }
  }, [isReceiving]);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={(e) => {
          e.preventDefault();
          if (!isReceiving) {
            if (syncCode.trim() && showInput) {
              onClick(syncCode.trim());
            } else {
              setShowInput(!showInput);
            }
          }
        }}
        className={`px-2 py-1 rounded-lg transition-colors duration-300 ${
          isDark
            ? isReceiving ? "bg-[#2ecc71]/30 text-[#2ecc71]" : "bg-[#03a9f4]/20 hover:bg-[#03a9f4]/30 text-[#03a9f4]"
            : isReceiving ? "bg-[#54ad95]/30 text-[#54ad95]" : "bg-[#0088fb]/10 hover:bg-[#0088fb]/20 text-[#0088fb]"
        } flex items-center gap-1 text-xs font-medium`}
        title="Receive Data"
        disabled={isReceiving}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <span className="hidden sm:inline">Receive</span>
        {isReceiving && <span className="animate-pulse">•</span>}
      </button>
      
      {showInput && !isReceiving && (
        <form onSubmit={handleSubmit} className="mt-1 flex items-center">
          <input
            type="text"
            value={syncCode}
            onChange={(e) => setSyncCode(e.target.value)}
            placeholder="Enter code"
            className={`text-xs px-2 py-1 rounded w-24 ${
              isDark
                ? "bg-[#333333]/60 border-[#2ecc71]/30 text-white placeholder-white/50"
                : "bg-white/60 border-[#54ad95]/30 text-black placeholder-black/50"
            } border focus:outline-none`}
            autoFocus
          />
          <button
            type="submit"
            className={`ml-1 px-2 py-1 text-xs rounded ${
              isDark
                ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71]"
                : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95]"
            }`}
          >
            Go
          </button>
        </form>
      )}
      
      {isReceiving && (
        <div className={`text-xs mt-1 ${isDark ? "text-white/70" : "text-black/70"}`}>
          Receiving...
        </div>
      )}
    </div>
  );
};