/**
 * QRCode Polyfill for @lo-fi/qr-data-sync
 * 
 * This script ensures that the QRCode object is properly defined
 * before the QRCodeSync library tries to use it.
 * 
 * Based on the qrcode-generator library API.
 */

(function() {
  // Check if QRCode is already defined
  if (typeof window.QRCode !== 'undefined') {
    console.log('QRCode library already loaded');
    return;
  }

  console.log('Creating QRCode polyfill for @lo-fi/qr-data-sync');
  
  // Create a QRCode constructor that matches the API expected by @lo-fi/qr-data-sync
  window.QRCode = function(typeNumber, errorCorrectionLevel) {
    this.typeNumber = typeNumber || 4;
    this.errorCorrectionLevel = errorCorrectionLevel || 'L';
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
    
    // Add required methods
    this.addData = function(data) {
      this.dataList.push(data);
    };
    
    this.isDark = function(row, col) {
      return false; // Placeholder
    };
    
    this.getModuleCount = function() {
      return this.moduleCount;
    };
    
    this.make = function() {
      // Placeholder implementation
      this.moduleCount = 33; // Typical QR code size
    };
    
    this.createImgTag = function(cellSize, margin) {
      cellSize = cellSize || 2;
      margin = margin || 4;
      
      // Create a simple placeholder image
      return '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="' + 
        (this.moduleCount * cellSize + margin * 2) + '" height="' + 
        (this.moduleCount * cellSize + margin * 2) + '"/>';
    };
    
    this.createSvgTag = function(cellSize, margin) {
      cellSize = cellSize || 2;
      margin = margin || 4;
      
      // Create a simple placeholder SVG
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + 
        (this.moduleCount * cellSize + margin * 2) + '" height="' + 
        (this.moduleCount * cellSize + margin * 2) + '"></svg>';
    };
    
    this.createTableTag = function(cellSize, margin) {
      cellSize = cellSize || 2;
      margin = margin || 4;
      
      // Create a simple placeholder table
      return '<table style="width:' + (this.moduleCount * cellSize + margin * 2) + 
        'px;height:' + (this.moduleCount * cellSize + margin * 2) + 
        'px;border:0;border-collapse:collapse;"></table>';
    };
  };
  
  // Add static methods that might be needed
  window.QRCode.stringToBytes = function(s) {
    var bytes = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      bytes.push(c & 0xff);
    }
    return bytes;
  };
  
  // Add error correction level constants
  window.QRCode.CorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };
  
  console.log('QRCode polyfill created successfully');
  
  // Load the real QRCode library
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  script.onload = function() {
    console.log('Real QRCode library loaded successfully');
  };
  script.onerror = function() {
    console.error('Failed to load real QRCode library, using polyfill');
  };
  document.head.appendChild(script);
})();