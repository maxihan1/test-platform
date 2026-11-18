// APK 의 문자열 표(resources.arsc)에서 앱이 화면에 띄울 문구를 꺼낸다 — PRD 옮기기에서 기획서 화면 문구를 앱과 맞댄다 (도메인/작성 §3.6 「종류별 기준」 화면 문구 · AUT-F4-09)
// author 이미지에는 apktool · aapt · 자바가 없다. 이미 쓰는 jszip 으로 풀고 문자열 표의 첫 문자열 묶음(값 문자열)만 읽는다

import { createWriteStream, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { fileURLToPath, pathToFileURL } from 'node:url';

import JSZip from 'jszip';

import type { 바꾸기 } from './authoring-guide.js';

const 표머리 = 0x0002;
const 문자열묶음 = 0x0001;
const UTF8 = 0x100;

/**
 * resources.arsc 의 값 문자열을 차례대로 · 겹침 없이 돌려준다. 키 이름(`app_name`)은 패키지 안 묶음이라 안 읽는다.
 * 리소스 파일 경로(`res/…`)는 문구가 아니라 뺀다. 줄바꿈은 `\n` 두 글자로 적어 한 줄에 문구 하나다
 */
export function 문자열표읽기(바이트: Uint8Array): string[] {
  const 뷰 = new DataView(바이트.buffer, 바이트.byteOffset, 바이트.byteLength);
  if (바이트.byteLength < 12 || 뷰.getUint16(0, true) !== 표머리) throw new Error('resources.arsc 머리가 아니다');
  let 자리 = 뷰.getUint16(2, true);
  while (자리 + 8 <= 바이트.byteLength) {
    const 크기 = 뷰.getUint32(자리 + 4, true);
    if (크기 < 8) break;
    if (뷰.getUint16(자리, true) === 문자열묶음) return 묶음읽기(바이트, 뷰, 자리);
    자리 += 크기;
  }
  throw new Error('resources.arsc 에 문자열 묶음이 없다');
}

function 묶음읽기(바이트: Uint8Array, 뷰: DataView, 시작: number): string[] {
  const 머리크기 = 뷰.getUint16(시작 + 2, true);
  const 개수 = 뷰.getUint32(시작 + 8, true);
  const utf8 = (뷰.getUint32(시작 + 16, true) & UTF8) !== 0;
  const 글시작 = 시작 + 뷰.getUint32(시작 + 20, true);
  const 본것 = new Set<string>();
  for (let i = 0; i < 개수; i++) {
    const 글 = 하나읽기(바이트, 뷰, 글시작 + 뷰.getUint32(시작 + 머리크기 + i * 4, true), utf8);
    if (글.trim() !== '' && !글.startsWith('res/')) 본것.add(글.replaceAll('\r', '\\r').replaceAll('\n', '\\n'));
  }
  return [...본것];
}

// 길이 칸은 1~2 칸이다 — 첫 칸 윗자리가 서 있으면 두 칸을 이어 읽는다(UTF-8 은 바이트, UTF-16 은 16비트 칸)
function 하나읽기(바이트: Uint8Array, 뷰: DataView, 자리: number, utf8: boolean): string {
  if (utf8) {
    자리 += 뷰.getUint8(자리) & 0x80 ? 2 : 1; // UTF-16 글자 수 — 안 쓴다
    let 길이 = 뷰.getUint8(자리);
    if (길이 & 0x80) 길이 = ((길이 & 0x7f) << 8) | 뷰.getUint8(++자리);
    자리 += 1;
    return new TextDecoder('utf-8').decode(바이트.subarray(자리, 자리 + 길이));
  }
  let 길이 = 뷰.getUint16(자리, true);
  if (길이 & 0x8000) {
    길이 = ((길이 & 0x7fff) << 16) | 뷰.getUint16(자리 + 2, true);
    자리 += 2;
  }
  자리 += 2;
  return new TextDecoder('utf-16le').decode(바이트.subarray(자리, 자리 + 길이 * 2));
}

export const 앱문구파일 = (자료: string): string => join(자료, 'app-strings.txt');

// ponytail: 압축을 메모리에 푼다 — 엑셀처럼 힙 1GB 로 막는다. APK 가 넘치면 resources.arsc 만 꺼내는 줄 단위 풀기로
const 꺼내기 = [
  '--max-old-space-size=1024',
  '--import',
  pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href,
  fileURLToPath(import.meta.url),
];

/**
 * 앱 링크(서명된 APK 주소)로 APK 를 받아 자료 폴더에 문구 파일을 둔다. 받은 APK 는 지운다.
 * 스토어 앱(패키지 이름) · 링크 없음 · 받기나 꺼내기 실패는 undefined — 맞대기 없이 작성은 간다.
 * 꺼내기는 믿을 수 없는 파일을 여는 일이라 엑셀처럼 자리 uid 로 따로 띄운다(`바꾸기`)
 */
export async function 앱문구받기(링크: string | undefined, 자료: string, 바꾸기: 바꾸기, 알림: (글: string) => void): Promise<string | undefined> {
  const 낼곳 = 앱문구파일(자료);
  const 받을곳 = join(자료, 'app.apk');
  const 못함 = (까닭: string) => void 알림(`앱 문구를 못 꺼냈다(${까닭}) — 맞대기 없이 간다`);
  try {
    // 이어받은 폴더의 앞 실행 것 — 이번에 못 꺼냈는데 옛 문구로 맞대면 안 된다. 앞 자식이 폴더 · 링크를 심어 뒀을 수 있어 통째로 지운다(리뷰 H6)
    rmSync(낼곳, { force: true, recursive: true });
    if (링크 === undefined || !/^https?:\/\//.test(링크)) return undefined;
    rmSync(받을곳, { force: true, recursive: true });
    const 답 = await fetch(링크, { signal: AbortSignal.timeout(300_000) });
    if (!답.ok || 답.body === null) {
      await 답.body?.cancel();
      return 못함(`APK 받기 ${답.status}`);
    }
    // 'wx' — 지운 뒤 그 사이에 심은 링크를 따라 쓰지 않는다
    await pipeline(Readable.fromWeb(답.body as ReadableStream<Uint8Array>), createWriteStream(받을곳, { mode: 0o644, flags: 'wx' }));
    const 꺼냄 = 바꾸기({ 명령: process.execPath, 인자: [...꺼내기, 받을곳, 낼곳] }, 자료);
    // 자식 node 의 stderr 는 스택 전체다 — 오류 줄 하나만 남긴다
    if (!꺼냄.ok) return 못함(꺼냄.까닭.split('\n').find((줄) => /^\w*Error\b/.test(줄)) ?? (꺼냄.까닭.trim().split('\n')[0] || '까닭 없음'));
    return 낼곳;
  } catch (err) {
    const 원인 = err instanceof Error && err.cause instanceof Error ? ` · ${(err.cause as NodeJS.ErrnoException).code ?? err.cause.message}` : '';
    return 못함(err instanceof Error ? `${err.name}: ${err.message}${원인}` : String(err));
  } finally {
    rmSync(받을곳, { force: true, recursive: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [받은것, 낼곳] = process.argv.slice(2);
  if (받은것 === undefined || 낼곳 === undefined) throw new Error('쓰는 법: authoring-apk-strings.ts <받은.apk> <낼.txt>');
  const 표 = (await JSZip.loadAsync(await readFile(받은것))).file('resources.arsc');
  if (표 === null) throw new Error('APK 안에 resources.arsc 가 없다');
  writeFileSync(낼곳, `${문자열표읽기(await 표.async('uint8array')).join('\n')}\n`, { mode: 0o644 });
}
