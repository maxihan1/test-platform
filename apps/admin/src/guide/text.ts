// 가이드 첨부를 화면이 글로 그리게 글자를 뽑는다 — .md · .txt 그대로, .docx 는 문단 글자 (도메인/작성 §3.6 「★ 서비스 가이드」 「열기」)

import JSZip from 'jszip';

import { extname } from 'node:path';

// 압축을 푼 본문 상한. 압축 폭탄으로 서버 메모리가 넘치지 않게 (§3.6 「열기」)
export const 풀기상한 = 20 * 1024 * 1024;

const 엔티티: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
// 범위 밖 번호는 fromCodePoint 가 던진다 — 만든 쪽이 마음대로 적을 수 있는 값이다
const 번호글자 = (n: number) => (n <= 0x10ffff ? String.fromCodePoint(n) : '');
const 풀기 = (글: string) =>
  글.replace(/&(?:#x([0-9a-f]{1,8})|#(\d{1,8})|(lt|gt|amp|quot|apos));/gi, (_, 십육: string | undefined, 십: string | undefined, 이름: string | undefined) =>
    십육 !== undefined ? 번호글자(Number.parseInt(십육, 16)) : 십 !== undefined ? 번호글자(Number(십)) : (엔티티[(이름 ?? '').toLowerCase()] ?? ''),
  );

/** document.xml 의 문단마다 w:t 글자를 이어 붙이고 문단끼리는 줄바꿈으로 잇는다 */
export function 문단글자(xml: string): string {
  const 문단들 = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  return 문단들.map((p) => [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => 풀기(m[1] ?? '')).join('')).join('\n');
}

/** 압축 목록이 적은 크기를 먼저 보고, 풀면서도 센다 — 목록 숫자는 파일을 만든 쪽이 마음대로 적을 수 있다 */
async function 본문풀기(몸: Buffer): Promise<string | null> {
  const zip = await JSZip.loadAsync(몸).catch(() => null);
  const 본문 = zip?.file('word/document.xml');
  if (!본문) return null;
  // 크기는 JSZip 이 공개 타입에 안 싣는다. 압축 목록 값이다
  const 적은크기 = (본문 as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
  if (적은크기 > 풀기상한) return null;
  return new Promise((resolve) => {
    const 조각: Buffer[] = [];
    let 합 = 0;
    const 흐름 = 본문.nodeStream('nodebuffer');
    흐름.on('data', (c: Buffer) => {
      합 += c.length;
      if (합 > 풀기상한) {
        흐름.pause();
        resolve(null);
        return;
      }
      조각.push(c);
    });
    흐름.on('error', () => resolve(null));
    흐름.on('end', () => resolve(Buffer.concat(조각).toString('utf8')));
  });
}

/** 글자를 못 뽑으면 null — 라우트가 415 NO_TEXT 로 보낸다 */
export async function 글자뽑기(이름: string, 몸: Buffer): Promise<string | null> {
  const 확장자 = extname(이름).toLowerCase();
  if (확장자 === '.md' || 확장자 === '.txt') return 몸.toString('utf8');
  if (확장자 !== '.docx') return null;
  const xml = await 본문풀기(몸);
  return xml === null ? null : 문단글자(xml);
}

/** 브라우저에 PDF 로 넘겨도 되나 — 확장자가 아니라 파일 머리로 본다 */
export const PDF인가 = (몸: Buffer) => 몸.subarray(0, 5).toString('latin1') === '%PDF-';
