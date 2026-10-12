const 작은png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f80f0000010101009a1ce5f90000000049454e44ae426082',
  'hex',
);
const 작은jpg = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbfcffd9',
  'hex',
);
const 작은gif = Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b', 'hex');

export interface 올릴파일 {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export function 파일만들기(이름: string, 바이트: number): 올릴파일 {
  const 확장자 = 이름.split('.').pop()?.toLowerCase() ?? '';
  const 머리 = 확장자 === 'png' ? 작은png : 확장자 === 'jpg' || 확장자 === 'jpeg' ? 작은jpg : 확장자 === 'gif' ? 작은gif : Buffer.from('데모 첨부 파일\n');
  const mimeType = 확장자 === 'png' ? 'image/png' : 확장자 === 'jpg' || 확장자 === 'jpeg' ? 'image/jpeg' : 확장자 === 'gif' ? 'image/gif' : 'text/plain';
  const 크기 = Math.max(바이트, 머리.length);
  const buffer = Buffer.alloc(크기);
  머리.copy(buffer);
  return { name: 이름, mimeType, buffer };
}

export const MB = 1024 * 1024;
