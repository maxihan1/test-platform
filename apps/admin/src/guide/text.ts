// 가이드 첨부를 화면이 글로 그리게 글자를 뽑는다 — .md · .txt 그대로, .docx 는 문단 글자 (도메인/작성 §3.6 「★ 서비스 가이드」 「열기」)

import JSZip from 'jszip';

import { extname } from 'node:path';
import type { Readable } from 'node:stream';

// 압축을 푼 본문 상한. 압축 폭탄으로 서버 메모리가 넘치지 않게 (§3.6 「열기」)
export const 풀기상한 = 20 * 1024 * 1024;

const 엔티티: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
// 범위 밖 번호는 fromCodePoint 가 던진다 — 만든 쪽이 마음대로 적을 수 있는 값이다
const 번호글자 = (n: number) => (n <= 0x10ffff ? String.fromCodePoint(n) : '');
const 풀기 = (글: string) =>
  글.replace(/&(?:#x([0-9a-f]{1,8})|#(\d{1,8})|(lt|gt|amp|quot|apos));/gi, (_, 십육: string | undefined, 십: string | undefined, 이름: string | undefined) =>
    십육 !== undefined ? 번호글자(Number.parseInt(십육, 16)) : 십 !== undefined ? 번호글자(Number(십)) : (엔티티[(이름 ?? '').toLowerCase()] ?? ''),
  );

/**
 * document.xml 의 w:t 글자를 문단마다 한 줄로 잇는다. w:tab 은 탭, w:br · w:cr 은 줄바꿈, 빈 문단(<w:p/>)은 빈 줄이다.
 * **정규식으로 문단을 잡지 않고 indexOf 로 한 번 훑는다** — 닫히지 않은 `<w:p ` 가 수백만 개인 본문에서
 * 게으른 정규식은 제곱 시간이 걸려 요청 하나가 서버를 멈춘다(2026-10-17 검토 실측 — 480KB 에 7초)
 */
export function 문단글자(xml: string): string {
  const 글: string[] = [];
  let 글자안 = false;
  let i = 0;
  while (i < xml.length) {
    const 열림 = xml.indexOf('<', i);
    if (글자안) 글.push(풀기(xml.slice(i, 열림 < 0 ? xml.length : 열림)));
    if (열림 < 0) break;
    const 닫힘 = xml.indexOf('>', 열림);
    if (닫힘 < 0) break;
    const 태그 = xml.slice(열림 + 1, 닫힘);
    const 이름 = /^\/?w:[a-zA-Z]+/.exec(태그)?.[0];
    const 홀로 = 태그.endsWith('/');
    if (이름 === 'w:t') 글자안 = !홀로;
    else if (이름 === '/w:t') 글자안 = false;
    else if (이름 === 'w:tab') 글.push('\t');
    else if (이름 === 'w:br' || 이름 === 'w:cr') 글.push('\n');
    else if (이름 === '/w:p' || (이름 === 'w:p' && 홀로)) 글.push('\n');
    i = 닫힘 + 1;
  }
  return 글.join('').replace(/\n$/, '');
}

/** 풀면서 센다. 압축 목록이 적은 크기는 먼저 보지만 만든 쪽이 마음대로 적을 수 있어(없을 수도 있다) 흐름에서 센 값이 마지막 그물이다 */
async function 본문풀기(몸: Buffer): Promise<string | null> {
  const zip = await JSZip.loadAsync(몸).catch(() => null);
  const 본문 = zip?.file('word/document.xml');
  if (!본문) return null;
  // 크기는 JSZip 이 공개 타입에 안 싣는다. 압축 목록 값이다
  const 적은크기 = (본문 as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (적은크기 !== undefined && 적은크기 > 풀기상한) return null;
  return new Promise((resolve) => {
    const 조각: Buffer[] = [];
    let 합 = 0;
    const 흐름 = 본문.nodeStream('nodebuffer') as Readable;
    흐름.on('data', (c: Buffer) => {
      합 += c.length;
      if (합 > 풀기상한) {
        조각.length = 0;
        흐름.destroy();
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
