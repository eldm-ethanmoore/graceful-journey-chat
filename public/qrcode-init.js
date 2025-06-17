/**
 * QRCode Initialization Script
 * 
 * This script ensures that the QRCode object is properly initialized
 * before the QRCodeSync library tries to use it.
 */

(function() {
  // Check if QRCode is already defined
  if (typeof window.QRCode !== 'undefined') {
    console.log('QRCode library already loaded');
    return;
  }

  console.log('Initializing QRCode from qrcode-generator');
  
  // Create a simple QRCode implementation that will be replaced by the real one
  // This is just to prevent errors if QRCodeSync tries to use QRCode before it's loaded
  window.QRCode = function(typeNumber, errorCorrectionLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  };

  window.QRCode.prototype = {
    addData: function(data) {
      this.dataList.push(data);
    },
    isDark: function(row, col) {
      return false; // Placeholder
    },
    getModuleCount: function() {
      return this.moduleCount;
    },
    make: function() {
      // Placeholder
    },
    createImgTag: function() {
      return '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="1" height="1"/>';
    },
    createSvgTag: function() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
    },
    createTableTag: function() {
      return '<table></table>';
    }
  };

  // Load the real QRCode library
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  script.onload = function() {
    console.log('QRCode library loaded successfully');
  };
  script.onerror = function() {
    console.error('Failed to load QRCode library');
  };
  document.head.appendChild(script);
})();