/**
 * QRCode Polyfill
 * 
 * This script provides a simple fallback implementation when the QRCode library
 * is not available. It creates a basic visual representation that looks like a QR code
 * but doesn't actually encode data. This is useful for UI testing and development
 * when the actual QR code library is not available.
 */

(function() {
  // Only create polyfill if QRCode is not already defined
  if (typeof QRCode !== 'undefined') {
    console.log('QRCode library already loaded, skipping polyfill');
    return;
  }

  console.log('QRCode library not found, loading polyfill');

  // Simple hash function to generate a deterministic pattern based on input text
  function simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return hash;
  }

  // QRCode polyfill constructor
  window.QRCode = function(element, options) {
    // Store the element
    this._element = typeof element === 'string' ? document.getElementById(element) : element;
    
    // Default options
    this._options = {
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: 'H'
    };
    
    // Override defaults with provided options
    if (options) {
      for (let key in options) {
        if (options.hasOwnProperty(key)) {
          this._options[key] = options[key];
        }
      }
    }
    
    // Initialize with empty text
    this._text = '';
    
    // Create initial empty QR code
    this._createEmptyQR();
  };

  // Method to clear the QR code
  window.QRCode.prototype.clear = function() {
    while (this._element.firstChild) {
      this._element.removeChild(this._element.firstChild);
    }
  };

  // Method to make a QR code
  window.QRCode.prototype.makeCode = function(text) {
    // Store the text
    this._text = text;
    
    // Clear the element
    this.clear();
    
    // Create a new QR code
    this._createQR(text);
  };

  // Private method to create an empty QR code
  window.QRCode.prototype._createEmptyQR = function() {
    const div = document.createElement('div');
    div.style.width = this._options.width + 'px';
    div.style.height = this._options.height + 'px';
    div.style.backgroundColor = this._options.colorLight;
    div.style.position = 'relative';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    
    const text = document.createElement('div');
    text.textContent = 'QR Code';
    text.style.color = '#666';
    text.style.fontSize = '14px';
    
    div.appendChild(text);
    this._element.appendChild(div);
  };

  // Private method to create a QR code
  window.QRCode.prototype._createQR = function(text) {
    // Create container
    const container = document.createElement('div');
    container.style.width = this._options.width + 'px';
    container.style.height = this._options.height + 'px';
    container.style.backgroundColor = this._options.colorLight;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // Generate a hash from the text
    const hash = simpleHash(text);
    
    // Create a grid of cells
    const gridSize = 21; // Standard QR code size
    const cellSize = Math.floor(this._options.width / gridSize);
    
    // Create position markers (the three large squares in corners)
    this._createPositionMarker(container, 0, 0, cellSize);
    this._createPositionMarker(container, gridSize - 7, 0, cellSize);
    this._createPositionMarker(container, 0, gridSize - 7, cellSize);
    
    // Create timing patterns (the lines of alternating cells)
    for (let i = 8; i < gridSize - 8; i++) {
      this._createCell(container, i, 6, cellSize, i % 2 === 0);
      this._createCell(container, 6, i, cellSize, i % 2 === 0);
    }
    
    // Create alignment pattern (the smaller square near the bottom-right corner)
    this._createAlignmentPattern(container, gridSize - 9, gridSize - 9, cellSize);
    
    // Create data cells (random pattern based on the hash)
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // Skip areas where we've already drawn position markers
        if ((x < 7 && y < 7) || // Top-left
            (x >= gridSize - 7 && y < 7) || // Top-right
            (x < 7 && y >= gridSize - 7) || // Bottom-left
            (x === 6 || y === 6) || // Timing patterns
            (x >= gridSize - 9 && y >= gridSize - 9 && x < gridSize - 4 && y < gridSize - 4)) { // Alignment pattern
          continue;
        }
        
        // Use the hash to determine if this cell should be filled
        const bitPos = (y * gridSize + x) % 32;
        const isFilled = ((hash >> bitPos) & 1) === 1;
        
        this._createCell(container, x, y, cellSize, isFilled);
      }
    }
    
    // Add a small label at the bottom
    const label = document.createElement('div');
    label.textContent = 'Polyfill QR';
    label.style.position = 'absolute';
    label.style.bottom = '5px';
    label.style.right = '5px';
    label.style.fontSize = '8px';
    label.style.color = '#999';
    container.appendChild(label);
    
    this._element.appendChild(container);
  };

  // Create a position marker (the three nested squares in corners)
  window.QRCode.prototype._createPositionMarker = function(container, x, y, cellSize) {
    // Outer square
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const isMiddleSquare = (i >= 1 && i <= 5 && j >= 1 && j <= 5);
        const isInnerSquare = (i >= 2 && i <= 4 && j >= 2 && j <= 4);
        
        const isFilled = isBorder || isInnerSquare;
        this._createCell(container, x + i, y + j, cellSize, isFilled);
      }
    }
  };

  // Create an alignment pattern (the smaller square near the bottom-right corner)
  window.QRCode.prototype._createAlignmentPattern = function(container, x, y, cellSize) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const isBorder = i === 0 || i === 4 || j === 0 || j === 4;
        const isCenter = i === 2 && j === 2;
        
        const isFilled = isBorder || isCenter;
        this._createCell(container, x + i, y + j, cellSize, isFilled);
      }
    }
  };

  // Create a single cell in the QR code
  window.QRCode.prototype._createCell = function(container, x, y, cellSize, isFilled) {
    const cell = document.createElement('div');
    cell.style.position = 'absolute';
    cell.style.left = (x * cellSize) + 'px';
    cell.style.top = (y * cellSize) + 'px';
    cell.style.width = cellSize + 'px';
    cell.style.height = cellSize + 'px';
    cell.style.backgroundColor = isFilled ? this._options.colorDark : this._options.colorLight;
    container.appendChild(cell);
  };

  console.log('QRCode polyfill loaded successfully');
})();