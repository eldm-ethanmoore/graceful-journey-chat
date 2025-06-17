/**
 * QRCodeSync Initialization
 *
 * This script checks if the QRCodeSync library is loaded from the CDN.
 * If not, it logs an error to help diagnose the issue.
 */

(function() {
  // Check if QRCodeSync is already defined
  if (typeof window.QRCodeSync !== 'undefined') {
    console.log('QRCodeSync library already loaded');
    return;
  }

  console.error('QRCodeSync library not found! The LoFi QR code animation will not work.');
  console.error('Make sure the CDN script is properly loaded:');
  console.error('<script src="https://cdn.jsdelivr.net/npm/@lo-fi/qr-data-sync@0.999.2/dist/qr-data-sync.min.js"></script>');
  
  // Create a non-functional QRCodeSync object that throws errors
  window.QRCodeSync = {
    send: function() {
      throw new Error('QRCodeSync library not loaded. Cannot send data via QR code.');
    },
    receive: function() {
      throw new Error('QRCodeSync library not loaded. Cannot receive data via QR code.');
    },
    makeCode: function() {
      throw new Error('QRCodeSync library not loaded. Cannot create QR code.');
    }
  };
  
  // Add a global function to check if QRCodeSync is properly loaded
  window.isQRCodeSyncLoaded = function() {
    return false;
  };
  
  console.log('QRCodeSync error handlers installed');
})();