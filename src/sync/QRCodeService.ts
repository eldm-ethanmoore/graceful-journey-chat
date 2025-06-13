/**
 * QR Code Service for WebRTC connection discovery
 * 
 * This service handles generating and parsing QR codes for WebRTC connections.
 * It creates secure, time-limited tokens for establishing connections between devices.
 * 
 * Note: You'll need to install the following packages:
 * npm install qrcode jsqr
 */

// For now, we'll use type declarations to avoid import errors
declare const QRCode: {
  toCanvas: (canvas: HTMLCanvasElement, text: string, options?: any) => Promise<void>;
  toDataURL: (text: string, options?: any) => Promise<string>;
};

declare const jsQR: (imageData: Uint8ClampedArray, width: number, height: number) => {
  data: string;
} | null;

/**
 * Connection information contained in QR code
 */
export interface ConnectionInfo {
  roomId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * QR Code service for connection discovery
 */
export class QRCodeService {
  private static TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes
  
  /**
   * Generate a QR code containing connection information
   * @param roomId Room ID to encode in the QR code
   * @param canvas Optional canvas element to render the QR code to
   * @returns Promise resolving to a data URL of the QR code if no canvas is provided
   */
  public static async generateQRCode(
    roomId: string,
    canvas?: HTMLCanvasElement
  ): Promise<string | void> {
    // Create connection info with security token
    const connectionInfo: ConnectionInfo = {
      roomId,
      token: this.generateSecurityToken(),
      expiresAt: Date.now() + this.TOKEN_EXPIRATION_MS,
      createdAt: Date.now()
    };
    
    // Convert to JSON string
    const connectionString = JSON.stringify(connectionInfo);
    
    // Generate QR code
    if (canvas) {
      return QRCode.toCanvas(canvas, connectionString, {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } else {
      return QRCode.toDataURL(connectionString, {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    }
  }
  
  /**
   * Scan a QR code from an image
   * @param imageData Image data from canvas or video frame
   * @param width Image width
   * @param height Image height
   * @returns Connection info if QR code is valid, null otherwise
   */
  public static scanQRCode(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
  ): ConnectionInfo | null {
    try {
      // Scan QR code
      const code = jsQR(imageData, width, height);
      
      if (!code) {
        return null;
      }
      
      // Parse connection info
      const connectionInfo: ConnectionInfo = JSON.parse(code.data);
      
      // Validate connection info
      if (
        !connectionInfo.roomId ||
        !connectionInfo.token ||
        !connectionInfo.expiresAt ||
        !connectionInfo.createdAt
      ) {
        console.error('Invalid QR code format');
        return null;
      }
      
      // Check if token is expired
      if (connectionInfo.expiresAt < Date.now()) {
        console.error('QR code has expired');
        return null;
      }
      
      return connectionInfo;
    } catch (error) {
      console.error('Error scanning QR code:', error);
      return null;
    }
  }
  
  /**
   * Generate a secure random token
   * @returns Random security token
   */
  private static generateSecurityToken(): string {
    // Generate a random string for security
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Validate a connection token
   * @param connectionInfo Connection info to validate
   * @returns True if token is valid, false otherwise
   */
  public static validateConnectionInfo(connectionInfo: ConnectionInfo): boolean {
    // Check if token is expired
    if (connectionInfo.expiresAt < Date.now()) {
      console.error('Connection token has expired');
      return false;
    }
    
    // Check if token is too old (created more than 15 minutes ago)
    if (Date.now() - connectionInfo.createdAt > this.TOKEN_EXPIRATION_MS) {
      console.error('Connection token is too old');
      return false;
    }
    
    return true;
  }
}