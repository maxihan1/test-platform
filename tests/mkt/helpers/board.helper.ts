import type { APIRequestContext, Cookie, Page } from '@playwright/test';
import { 로그인요청, 새회원으로로그인, 회원정리, type 회원정보 } from './account.helper.js';
import { 방해창막기 } from './browser.helper.js';
import { 글만들기, 글지우기, 고유글자 } from './data.helper.js';

export const 기본본문 = '게시판 케이스가 만든 글의 본문입니다';

export interface 글쓴이와글 {
  회원: 회원정보;
  글번호: number;
  제목: string;
  본문: string;
}

export async function 글쓴이와글만들기(요청: APIRequestContext, 제목머리: string): Promise<글쓴이와글> {
  const 회원 = await 새회원으로로그인(요청);
  const 제목 = 고유글자(제목머리);
  const 글번호 = await 글만들기(요청, { title: 제목, content: 기본본문 });
  return { 회원, 글번호, 제목, 본문: 기본본문 };
}

export async function 글쓴이와글정리(요청: APIRequestContext, 준비: 글쓴이와글, 더지울글번호들: number[] = []): Promise<void> {
  for (const 글번호 of [준비.글번호, ...더지울글번호들]) await 글지우기(요청, 글번호);
  await 회원정리(요청, 준비.회원);
}

export async function 글번호들정리(요청: APIRequestContext, 글번호들: number[]): Promise<void> {
  for (const 글번호 of 글번호들) await 글지우기(요청, 글번호);
}

const 크기표 = (() => {
  const 표: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    표.push(c >>> 0);
  }
  return 표;
})();

function crc32(바이트들: Buffer): number {
  let c = 0xffffffff;
  for (const 바이트 of 바이트들) c = (크기표[(c ^ 바이트) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function 압축없는zlib(자료: Buffer): Buffer {
  let a = 1;
  let b = 0;
  for (const 바이트 of 자료) {
    a = (a + 바이트) % 65521;
    b = (b + a) % 65521;
  }
  const 머리 = Buffer.from([0x78, 0x01, 0x01, 자료.length & 0xff, 자료.length >> 8, ~자료.length & 0xff, (~자료.length >> 8) & 0xff]);
  const 끝 = Buffer.alloc(4);
  끝.writeUInt32BE(((b << 16) | a) >>> 0);
  return Buffer.concat([머리, 자료, 끝]);
}

function 덩어리(종류: string, 자료: Buffer): Buffer {
  const 길이 = Buffer.alloc(4);
  길이.writeUInt32BE(자료.length);
  const 종류와자료 = Buffer.concat([Buffer.from(종류, 'latin1'), 자료]);
  const 검사값 = Buffer.alloc(4);
  검사값.writeUInt32BE(crc32(종류와자료));
  return Buffer.concat([길이, 종류와자료, 검사값]);
}

export function png만들기(바이트수 = 0): Buffer {
  const 변 = 16;
  const 머리 = Buffer.alloc(13);
  머리.writeUInt32BE(변, 0);
  머리.writeUInt32BE(변, 4);
  머리[8] = 8;
  머리[9] = 2;
  const 줄 = Buffer.concat([Buffer.from([0]), Buffer.alloc(변 * 3, 0x7c)]);
  const 그림 = 압축없는zlib(Buffer.concat(Array.from({ length: 변 }, () => 줄)));
  const 서명 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const 앞 = [서명, 덩어리('IHDR', 머리)];
  const 뒤 = [덩어리('IDAT', 그림), 덩어리('IEND', Buffer.alloc(0))];
  const 기본 = Buffer.concat([...앞, ...뒤]);
  if (바이트수 <= 기본.length + 20) return 기본;
  const 채움 = 덩어리('tEXt', Buffer.concat([Buffer.from('Comment\0', 'latin1'), Buffer.alloc(바이트수 - 기본.length - 12 - 8, 0x61)]));
  return Buffer.concat([...앞, 채움, ...뒤]);
}

export function gif만들기(): Buffer {
  return Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
}

export const 메가 = 1024 * 1024;

export async function 이미지글만들기(요청: APIRequestContext, 글: { title: string; content: string }): Promise<number> {
  const 응답 = await 요청.post('/api/posts', {
    data: { category: '자유', title: 글.title, content: 글.content, images: [`data:image/png;base64,${png만들기().toString('base64')}`] },
  });
  if (응답.status() !== 201) throw new Error(`이미지 글 만들기가 실패했다: ${응답.status()} ${await 응답.text()}`);
  return ((await 응답.json()) as { id: number }).id;
}

export async function 댓글수세기(요청: APIRequestContext, 글번호: number): Promise<number> {
  const 응답 = await 요청.get(`/api/posts/${글번호}/comments`);
  if (응답.status() !== 200) throw new Error(`댓글 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { items: { deleted: boolean }[] }).items.filter((댓글) => !댓글.deleted).length;
}

export async function 제목으로찾은글번호들(요청: APIRequestContext, 제목: string): Promise<number[]> {
  const 응답 = await 요청.get(`/api/posts?category=${encodeURIComponent('전체')}&field=title&q=${encodeURIComponent(제목)}&sort=latest&page=1&size=10`);
  if (응답.status() !== 200) throw new Error(`글 검색이 실패했다: ${응답.status()} ${await 응답.text()}`);
  return ((await 응답.json()) as { items: { id: number }[] }).items.map((글) => 글.id);
}

export async function 열한번째글번호(요청: APIRequestContext): Promise<number> {
  const 응답 = await 요청.get('/api/posts?category=%EC%A0%84%EC%B2%B4&sort=latest&page=1&size=11');
  if (응답.status() !== 200) throw new Error(`글 목록 조회가 실패했다: ${응답.status()}`);
  const 글들 = ((await 응답.json()) as { items: { id: number }[] }).items;
  const 열한번째 = 글들[10];
  if (열한번째 === undefined) throw new Error('글이 열한 개가 안 된다');
  return 열한번째.id;
}

export async function 비밀번호틀리기(요청: APIRequestContext, 회원: 회원정보, 횟수: number): Promise<void> {
  for (let 번 = 0; 번 < 횟수; 번 += 1) await 로그인요청(요청, 회원.loginId, `${회원.password}x`);
}

export async function 만료있는쿠키(page: Page): Promise<Cookie[]> {
  return (await page.context().cookies()).filter((쿠키) => 쿠키.expires > 0);
}

export async function 쿠키만옮긴새화면(page: Page, 쿠키들: Cookie[]): Promise<{ 화면: Page; 닫기: () => Promise<void> }> {
  const 브라우저 = page.context().browser();
  if (브라우저 === null) throw new Error('이 문맥에는 브라우저가 없어 새 브라우저 문맥을 열 수 없다');
  const 문맥 = await 브라우저.newContext({ baseURL: new URL(page.url()).origin });
  await 문맥.addCookies(쿠키들);
  const 화면 = await 문맥.newPage();
  await 방해창막기(화면);
  return { 화면, 닫기: () => 문맥.close() };
}

export async function 클립보드권한주기(page: Page): Promise<void> {
  if (page.context().browser()?.browserType().name() !== 'webkit') {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  }
  await page.addInitScript(() => {
    if (navigator.clipboard) return;
    let 저장값 = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (글: string): Promise<void> => {
          저장값 = 글;
        },
        readText: async (): Promise<string> => 저장값,
      },
    });
  });
}

export async function 글제목읽기(요청: APIRequestContext, 글번호: number): Promise<string> {
  const 응답 = await 요청.get(`/api/posts/${글번호}`);
  if (응답.status() !== 200) return `글을 읽지 못했다: ${응답.status()}`;
  return ((await 응답.json()) as { title: string }).title;
}

export async function 좋아요요청(요청: APIRequestContext, 글번호: number): Promise<number> {
  const 응답 = await 요청.post(`/api/posts/${글번호}/like`);
  return 응답.status();
}

export async function 글이있는가(요청: APIRequestContext, 글번호: number): Promise<boolean> {
  return (await 요청.get(`/api/posts/${글번호}`)).status() === 200;
}

export function 상세글번호(주소: string): number {
  return Number(new URL(주소).pathname.split('/').pop());
}

export async function 제목으로찾은글지우기(요청: APIRequestContext, 제목: string): Promise<void> {
  await 글번호들정리(요청, await 제목으로찾은글번호들(요청, 제목));
}
