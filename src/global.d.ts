import 'react';

declare module 'react' {
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}

// Add TypeScript declaration for window.ethereum
interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (request: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (result: any) => void) => void;
    removeListener?: (event: string, callback: (result: any) => void) => void;
    selectedAddress?: string | null;
    enable?: () => Promise<string[]>; // Deprecated but sometimes needed
    isConnected?: () => boolean;
  };
  
  // Add global QRCodeSync for compatibility with the polyfill
  QRCodeSync?: {
    send: (
      data: any,
      element: HTMLElement | string,
      options?: any
    ) => Promise<boolean>;
    receive: (
      element: HTMLVideoElement | string,
      options?: any
    ) => Promise<any>;
    makeCode: (
      text: string,
      element: HTMLElement | string
    ) => void;
  };
}
