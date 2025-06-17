/**
 * Type declarations for @lo-fi/qr-data-sync
 * 
 * These type declarations provide TypeScript support for the @lo-fi/qr-data-sync library.
 * They are based on the library's API and usage patterns.
 */

declare module '@lo-fi/qr-data-sync' {
  /**
   * Options for sending data via QR codes
   */
  export interface SendOptions {
    /**
     * AbortSignal to cancel the operation
     */
    signal?: AbortSignal;
    
    /**
     * Callback when a frame is rendered
     * @param frameIndex Index of the current frame
     * @param frameCount Total number of frames
     */
    onFrameRendered?: (frameIndex: number, frameCount: number) => void;
    
    /**
     * Maximum frames per second
     * Default: 10
     */
    maxFramesPerSecond?: number;
    
    /**
     * Size of each text chunk in a frame
     * Default: 100
     */
    frameTextChunkSize?: number;
    
    /**
     * Size of the QR code in pixels
     * Default: 256
     */
    qrCodeSize?: number;
  }

  /**
   * Options for receiving data via QR codes
   */
  export interface ReceiveOptions {
    /**
     * AbortSignal to cancel the operation
     */
    signal?: AbortSignal;
    
    /**
     * Callback when a frame is received
     * @param framesRead Number of frames read
     * @param frameCount Total number of frames
     * @param frameIndex Index of the current frame
     */
    onFrameReceived?: (framesRead: number, frameCount: number, frameIndex: number) => void;
    
    /**
     * Maximum scans per second
     * Default: 10
     */
    maxScansPerSecond?: number;
    
    /**
     * Preferred camera to use
     * 'environment' for back camera, 'user' for front camera
     * Default: 'environment'
     */
    preferredCamera?: 'environment' | 'user';
    
    /**
     * Whether to highlight the scan region
     * Default: false
     */
    highlightScanRegion?: boolean;
  }

  /**
   * Result of a receive operation
   */
  export interface ReceiveResult {
    /**
     * The received data
     */
    data: any;
    
    /**
     * Whether the operation was successful
     */
    success: boolean;
  }

  /**
   * Send data via QR codes
   * @param data Data to send
   * @param element DOM element to render QR codes in
   * @param options Options for sending
   * @returns Promise that resolves when sending starts
   */
  export function send(
    data: any,
    element: HTMLElement | string,
    options?: SendOptions
  ): Promise<boolean>;

  /**
   * Receive data via QR codes
   * @param element Video element for camera feed
   * @param options Options for receiving
   * @returns Promise that resolves with received data
   */
  export function receive(
    element: HTMLVideoElement | string,
    options?: ReceiveOptions
  ): Promise<ReceiveResult>;
}