import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Wallet } from 'lucide-react';

// Define props for the RainbowAuthUI component
interface RainbowAuthUIProps {
  isDark: boolean;
  authServerUrl: string;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

/**
 * RainbowAuthUI component for wallet authentication using RainbowKit
 */
export const RainbowAuthUI: React.FC<RainbowAuthUIProps> = ({
  isDark,
  authServerUrl,
  onAuthChange
}) => {
  const { isConnected } = useAccount();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Monitor connection status and notify parent component
  useEffect(() => {
    if (onAuthChange) {
      onAuthChange(isConnected || false);
    }
    
    // Log connection status for debugging
    console.log("Wallet connection status:", isConnected ? "Connected" : "Disconnected");
  }, [isConnected, onAuthChange]);

  // Handle connection errors
  useEffect(() => {
    if (connectionError) {
      console.error("Wallet connection error:", connectionError);
    }
  }, [connectionError]);
  
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <div className="flex items-center gap-2 mb-4">
        <Wallet className={`w-5 h-5 ${isDark ? 'text-[#2ecc71]' : 'text-[#54ad95]'}`} />
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Wallet Authentication
        </h2>
      </div>
      
      {/* RainbowKit Connect Button */}
      <div className="my-4">
        <div className="flex flex-col items-center">
          <div className="mb-2">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
          <div className="text-xs text-center mt-2">
            <p className={isDark ? "text-gray-400" : "text-gray-500"}>
              {isConnected ?
                "Wallet connected successfully" :
                "Connect your wallet for enhanced features"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Information Text */}
      <p className={`mt-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Connect your wallet for enhanced features (optional)
      </p>
    </div>
  );
};