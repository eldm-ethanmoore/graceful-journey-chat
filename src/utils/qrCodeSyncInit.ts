/**
 * QR Code Sync Initialization
 *
 * This module ensures the @lo-fi/qr-data-sync library is properly initialized
 * and available as a global object for use throughout the application.
 */

import * as QRCodeSyncModule from '@lo-fi/qr-data-sync';

// Initialize the QR code sync library
export function initQRCodeSync(): void {
  // Check if QRCodeSync is already defined as a global object
  if (typeof window.QRCodeSync !== 'undefined') {
    console.log('QRCodeSync already initialized as global object');
    return;
  }

  try {
    // Assign the imported module to the window object
    window.QRCodeSync = QRCodeSyncModule;
    
    // Verify the assignment worked
    if (typeof window.QRCodeSync?.send === 'function' &&
        typeof window.QRCodeSync?.receive === 'function') {
      console.log('QRCodeSync successfully initialized as global object');
    } else {
      console.error('QRCodeSync initialization failed - methods not available');
    }
  } catch (error) {
    console.error('Error initializing QRCodeSync:', error);
  }
}

// Add a global function to check if QRCodeSync is properly loaded
export function isQRCodeSyncAvailable(): boolean {
  const hasQRCodeSync = typeof window !== 'undefined' &&
                       typeof window.QRCodeSync !== 'undefined' &&
                       typeof window.QRCodeSync.send === 'function' &&
                       typeof window.QRCodeSync.receive === 'function';
  
  const hasQRCode = typeof window !== 'undefined' &&
                   typeof window.QRCode !== 'undefined';
  
  console.log('QRCodeSync availability check:', { hasQRCodeSync, hasQRCode });
  
  return hasQRCodeSync;
}

// Declare the QRCodeSync global type
declare global {
  interface Window {
    QRCodeSync: typeof QRCodeSyncModule;
    QRCode: any; // QRCode library type
    isQRCodeSyncLoaded?: () => boolean;
  }
}