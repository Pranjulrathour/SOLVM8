declare module 'docx-parser' {
  export function parseDocx(buffer: Buffer, callback: (err: Error | null, data: string) => void): void;
}