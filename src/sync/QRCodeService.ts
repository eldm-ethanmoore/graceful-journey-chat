import { EventEmitter } from 'events';
import { SimpleQRCode } from '../utils/SimpleQRCode';

/**
 * Interface for QR code service events
 */
export interface QRCodeServiceEvents {
  'qr-created': (text: string) => void;
  'qr-error': (error: Error) => void;
}

/**
 * QR Code Service for creating and managing QR codes
 * This is a simplified service that doesn't rely on external libraries
 */
export class QRCodeService extends EventEmitter {
  private qrCode: SimpleQRCode | null = null;
  private element: HTMLElement | null = null;
  private text: string = '';

  /**
   * Create a new QRCodeService
   */
  constructor() {
    super();
  }

  /**
   * Check if QR code functionality is available
   * @returns True if QR code functionality is available
   */
  isAvailable(): boolean {
    return true; // SimpleQRCode is always available
  }

  /**
   * Create a QR code
   * @param text Text to encode in the QR code
   * @param element Element to render the QR code in
   * @returns Promise that resolves when the QR code is created
   */
  async createQRCode(text: string, element: HTMLElement | string): Promise<boolean> {
    try {
      // Store the text for later reference
      this.text = text;

      // Resolve the element
      let targetElement: HTMLElement;
      if (typeof element === 'string') {
        const foundElement = document.getElementById(element);
        if (!foundElement) {
          throw new Error(`Element with ID ${element} not found`);
        }
        targetElement = foundElement;
      } else {
        targetElement = element;
      }

      // Store the element for later reference
      this.element = targetElement;

      // Create a new SimpleQRCode
      this.qrCode = new SimpleQRCode(targetElement);
      
      // Generate the QR code
      this.qrCode.makeCode(text);

      // Emit the created event
      this.emit('qr-created', text);
      
      return true;
    } catch (error: any) {
      console.error('Error creating QR code:', error);
      this.emit('qr-error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Clear the QR code
   */
  clearQRCode(): void {
    if (this.qrCode) {
      this.qrCode.clear();
    }
  }

  /**
   * Get the text encoded in the QR code
   * @returns The text encoded in the QR code
   */
  getText(): string {
    return this.text;
  }

  /**
   * Register an event listener
   * @param event Event name
   * @param listener Event listener
   */
  on<K extends keyof QRCodeServiceEvents>(event: K, listener: QRCodeServiceEvents[K]): this {
    return super.on(event, listener);
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener
   */
  off<K extends keyof QRCodeServiceEvents>(event: K, listener: QRCodeServiceEvents[K]): this {
    return super.off(event, listener);
  }

  /**
   * Create a QR code in a fixed container
   * This is useful for creating QR codes in a modal or popup
   * @param text Text to encode in the QR code
   * @returns Promise that resolves when the QR code is created
   */
  async createFixedQRCode(text: string): Promise<boolean> {
    // Create a fixed container if it doesn't exist
    const containerId = 'qr-code-container-fixed';
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '50%';
      container.style.left = '50%';
      container.style.transform = 'translate(-50%, -50%)';
      container.style.width = '300px';
      container.style.height = '300px';
      container.style.backgroundColor = 'white';
      container.style.padding = '20px';
      container.style.borderRadius = '8px';
      container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      container.style.zIndex = '1000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      
      // Add a close button
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '10px';
      closeButton.style.right = '10px';
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.border = 'none';
      closeButton.style.fontSize = '24px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = '#333';
      closeButton.onclick = () => {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
      
      // Add a QR code container
      const qrContainer = document.createElement('div');
      qrContainer.style.width = '200px';
      qrContainer.style.height = '200px';
      qrContainer.style.backgroundColor = 'white';
      
      // Add a title
      const title = document.createElement('div');
      title.textContent = 'Scan this QR code';
      title.style.marginBottom = '15px';
      title.style.fontWeight = 'bold';
      title.style.color = '#333';
      
      container.appendChild(closeButton);
      container.appendChild(title);
      container.appendChild(qrContainer);
      
      document.body.appendChild(container);
      
      return this.createQRCode(text, qrContainer);
    } else {
      // Container already exists, just update it
      container.style.display = 'flex';
      
      // Find the QR code container
      const qrContainer = container.querySelector('div:not(:first-child)');
      if (qrContainer) {
        return this.createQRCode(text, qrContainer as HTMLElement);
      } else {
        return false;
      }
    }
  }

  /**
   * Hide the fixed QR code container
   */
  hideFixedQRCode(): void {
    const container = document.getElementById('qr-code-container-fixed');
    if (container) {
      container.style.display = 'none';
    }
  }

  /**
   * Create a QR code for sharing data
   * @param data Data to share
   * @returns Promise that resolves when the QR code is created
   */
  async shareData(data: any): Promise<boolean> {
    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);
      
      // Create a QR code with the JSON string
      return this.createFixedQRCode(jsonString);
    } catch (error: any) {
      console.error('Error sharing data:', error);
      this.emit('qr-error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
}

// Create a singleton instance
export const qrCodeService = new QRCodeService();