import { X } from "lucide-react"

interface ConsentBannerProps {
  isDark: boolean
  onAccept: () => void
  onDecline: () => void
}

export const ConsentBanner = ({
  isDark,
  onAccept,
  onDecline
}: ConsentBannerProps) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-500 ${
      isDark ? "bg-[#1a1d23]/90 border-t border-[#2ecc71]/30" : "bg-[#f0f8ff]/90 border-t border-[#54ad95]/30"
    } backdrop-blur-xl`}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
          We use localStorage to save your preferences (theme, model selection, and settings).
          This data stays on your device and helps provide a personalized experience.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
            } backdrop-blur-sm border`}
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-[#333333]/60 hover:bg-[#444444]/80 text-[#f0f8ff] border-[#2ecc71]/20"
                : "bg-[#f0f8ff]/60 hover:bg-[#f0f8ff]/80 text-[#1a1d23] border-[#54ad95]/20"
            } backdrop-blur-sm border`}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};