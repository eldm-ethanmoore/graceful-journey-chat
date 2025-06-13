import React, { useState, useEffect, useRef } from 'react';
import { Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi';
import { WagmiAuth } from '../auth/WagmiAuth';

// Define props for the AuthUI component
interface AuthUIProps {
  isDark: boolean;
  authServerUrl: string;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

/**
 * AuthUI component for wallet authentication using wagmi
 */
export const AuthUI: React.FC<AuthUIProps> = ({
  isDark,
  authServerUrl,
  onAuthChange
}) => {
  // State
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // Auth service ref
  const authRef = useRef<WagmiAuth | null>(null);
  
  // Initialize auth service
  useEffect(() => {
    authRef.current = new WagmiAuth(authServerUrl);
    setIsAuthenticated(authRef.current.isAuthenticated());
    setAuthToken(authRef.current.getToken());
  }, [authServerUrl]);
  
  // Wagmi hooks - simplified
  const { address, isConnected } = useAccount();
  const { isPending: isLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  
  // Check if MetaMask is installed - direct check
  const hasMetaMask = typeof window !== 'undefined' &&
                     typeof window.ethereum !== 'undefined' &&
                     window.ethereum?.isMetaMask;
  
  // For debugging
  console.log("Has window.ethereum.isMetaMask:", hasMetaMask);
  
  // MetaMask is installed if window.ethereum is available with isMetaMask flag
  const isMetaMaskInstalled = Boolean(hasMetaMask);
  
  // Notify parent component of auth changes
  useEffect(() => {
    if (onAuthChange) {
      onAuthChange(isConnected);
    }
  }, [isConnected, onAuthChange]);
  
  // Handle login
  const handleLogin = async () => {
    setError(null);
    try {
      console.log("Starting login process...");
      
      // Check if MetaMask is installed
      if (!isMetaMaskInstalled) {
        setError('MetaMask is not installed. Please install MetaMask to continue.');
        return;
      }
      
      // Use direct window.ethereum approach
      try {
        console.log("Using direct window.ethereum approach");
        
        // Check if MetaMask is locked
        const initialAccounts = await window.ethereum!.request({ method: 'eth_accounts' });
        console.log("Initial accounts:", initialAccounts);
        
        if (!initialAccounts || initialAccounts.length === 0) {
          console.log("MetaMask appears to be locked. Requesting access...");
        }
        
        // Use non-null assertion since we've already checked isMetaMaskInstalled
        const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
        console.log("Accounts received:", accounts);
        
        // If we get here, the connection was successful
        // The wagmi hooks should detect this connection
      } catch (directError) {
        console.error("MetaMask connection error:", directError);
        
        // Handle specific error codes
        const err = directError as { code?: number; message?: string };
        if (err.code === 4001) {
          setError('Connection request was rejected. Please approve the connection request in MetaMask.');
        } else if (err.code === -32002) {
          setError('MetaMask is already processing a request. Please check the MetaMask extension.');
        } else if (err.message?.includes('wallet must has at least one account')) {
          setError('Your MetaMask wallet is locked. Please unlock it and make sure you have at least one account.');
        } else {
          throw directError;
        }
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  
  // Handle authentication after wallet connection
  useEffect(() => {
    const authenticateWithWallet = async () => {
      if (isConnected && address && authRef.current && !isAuthenticated) {
        try {
          setError(null);
          const result = await authRef.current.authenticate(address);
          setIsAuthenticated(true);
          setAuthToken(result.token);
        } catch (error) {
          console.error('Authentication error:', error);
          setError(error instanceof Error ? error.message : String(error));
        }
      }
    };
    
    authenticateWithWallet();
  }, [isConnected, address, isAuthenticated]);
  
  // Handle logout
  const handleLogout = () => {
    if (authRef.current) {
      authRef.current.logout();
      setIsAuthenticated(false);
      setAuthToken(null);
    }
    disconnect();
    setError(null);
  };
  
  // Format address for display
  const formatAddress = (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
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
      
      {/* MetaMask Not Installed Warning */}
      {!isMetaMaskInstalled && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
        }`}>
          <p className="mb-2">MetaMask is not installed. Please install MetaMask to use wallet features.</p>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark 
                ? 'bg-yellow-800/50 hover:bg-yellow-800/70 text-yellow-200' 
                : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-800'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Install MetaMask
          </a>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${
          isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
        }`}>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Authentication Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isAuthenticated
              ? isDark ? 'bg-green-400' : 'bg-green-600'
              : isDark ? 'bg-gray-500' : 'bg-gray-400'
          }`} />
          <p className={`text-sm font-medium ${
            isAuthenticated
              ? isDark ? 'text-green-400' : 'text-green-600'
              : isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </p>
        </div>
        
        {address && (
          <p className={`text-xs mt-1 ml-4 font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {ensName || formatAddress(address)}
          </p>
        )}
      </div>
      
      {/* Action Button */}
      {isAuthenticated ? (
        <button
          onClick={handleLogout}
          className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
            isDark
              ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-500/30'
              : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200'
          } backdrop-blur-sm border flex items-center justify-center gap-2`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Disconnect Wallet
        </button>
      ) : (
        <button
          onClick={handleLogin}
          disabled={!isMetaMaskInstalled || isLoading}
          className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
            isDark
              ? 'bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30 disabled:bg-gray-700/30 disabled:text-gray-500 disabled:border-gray-600/30'
              : 'bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30 disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-300'
          } backdrop-blur-sm border disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09986L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.04858 1L15.0707 10.809L12.7423 5.09986L2.04858 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M28.2292 23.5335L24.7797 28.8721L32.2767 30.9103L34.4367 23.6501L28.2292 23.5335Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M0.580078 23.6501L2.72801 30.9103L10.213 28.8721L6.77554 23.5335L0.580078 23.6501Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.8254 14.5792L7.73865 17.6478L15.1477 17.9799L14.9067 9.87598L9.8254 14.5792Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M25.1719 14.5792L20.0026 9.78436L19.8496 17.9799L27.2587 17.6478L25.1719 14.5792Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10.213 28.8721L14.7022 26.7031L10.8254 23.7031L10.213 28.8721Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.2949 26.7031L24.7841 28.8721L24.1717 23.7031L20.2949 26.7031Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Connect with MetaMask
            </>
          )}
        </button>
      )}
      
      {/* Information Text */}
      <p className={`mt-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {isAuthenticated
          ? '✓ Your wallet is authenticated securely'
          : 'Connect your wallet for enhanced features (optional)'
        }
      </p>
    </div>
  );
};