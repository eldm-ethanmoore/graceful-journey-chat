declare module 'qrcode' {
  export function toCanvas(
    canvas: HTMLCanvasElement | string,
    text: string,
    options?: {
      width?: number;
      margin?: number;
      scale?: number;
      color?: {
        dark?: string;
        light?: string;
      };
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<HTMLCanvasElement>;

  export function toDataURL(
    text: string,
    options?: {
      width?: number;
      margin?: number;
      scale?: number;
      color?: {
        dark?: string;
        light?: string;
      };
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<string>;

  export function toString(
    text: string,
    options?: {
      type?: string;
      width?: number;
      margin?: number;
      scale?: number;
      color?: {
        dark?: string;
        light?: string;
      };
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<string>;
}