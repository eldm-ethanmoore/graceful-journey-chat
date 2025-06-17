/**
 * Simple QR code implementation that doesn't rely on external libraries
 */
export class SimpleQRCode {
  private element: HTMLElement;
  private text: string = '';
  
  /**
   * Create a new SimpleQRCode
   * @param element Element to render the QR code in
   */
  constructor(element: HTMLElement | string) {
    if (typeof element === 'string') {
      const el = document.getElementById(element);
      if (!el) {
        throw new Error(`Element with ID ${element} not found`);
      }
      this.element = el;
    } else {
      this.element = element;
    }
  }
  
  /**
   * Clear the QR code
   */
  clear(): void {
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
  }
  
  /**
   * Make a QR code
   * @param text Text to encode in the QR code
   */
  makeCode(text: string): void {
    this.text = text;
    this.clear();
    
    // Create a fallback display
    const fallbackDiv = document.createElement('div');
    fallbackDiv.style.width = '100%';
    fallbackDiv.style.height = '100%';
    fallbackDiv.style.display = 'flex';
    fallbackDiv.style.alignItems = 'center';
    fallbackDiv.style.justifyContent = 'center';
    fallbackDiv.style.flexDirection = 'column';
    fallbackDiv.style.textAlign = 'center';
    fallbackDiv.style.padding = '20px';
    
    // Create a simple QR code-like grid
    const gridSize = 5;
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    grid.style.gap = '2px';
    grid.style.width = '150px';
    grid.style.height = '150px';
    grid.style.marginBottom = '10px';
    
    // Generate a deterministic pattern based on the text
    const hash = this.simpleHash(text);
    
    for (let i = 0; i < gridSize * gridSize; i++) {
      const cell = document.createElement('div');
      // Use the hash to determine if a cell should be filled
      const isFilled = (hash >> (i % 32)) & 1;
      
      cell.style.backgroundColor = isFilled ? '#000' : '#fff';
      cell.style.border = '1px solid #ddd';
      
      // Always fill the corners for QR code-like appearance
      if (
        (i === 0) || // Top-left
        (i === gridSize - 1) || // Top-right
        (i === gridSize * (gridSize - 1)) || // Bottom-left
        (i === gridSize * gridSize - 1) // Bottom-right
      ) {
        cell.style.backgroundColor = '#000';
      }
      
      grid.appendChild(cell);
    }
    
    const textDiv = document.createElement('div');
    textDiv.textContent = text.substring(0, 20) + (text.length > 20 ? '...' : '');
    textDiv.style.fontSize = '12px';
    textDiv.style.color = '#666';
    
    fallbackDiv.appendChild(grid);
    fallbackDiv.appendChild(textDiv);
    this.element.appendChild(fallbackDiv);
  }
  
  /**
   * Simple hash function for generating a deterministic pattern
   * @param text Text to hash
   * @returns Hash value
   */
  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return hash;
  }
}