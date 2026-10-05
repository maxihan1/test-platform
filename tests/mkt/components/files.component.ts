const PNG머리 = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082', 'hex');

export interface 올릴파일 {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export function png파일(이름: string, 바이트 = PNG머리.length): 올릴파일 {
  const 채울것 = Math.max(0, 바이트 - PNG머리.length);
  return { name: 이름, mimeType: 'image/png', buffer: Buffer.concat([PNG머리, Buffer.alloc(채울것)]) };
}

export function gif파일(이름: string): 올릴파일 {
  return { name: 이름, mimeType: 'image/gif', buffer: Buffer.from('474946383961010001000000002c00000000010001000002024401003b', 'hex') };
}

export function 일반파일(이름: string, 바이트: number): 올릴파일 {
  return { name: 이름, mimeType: 'application/octet-stream', buffer: Buffer.alloc(바이트, 97) };
}

export const MB = 1024 * 1024;
