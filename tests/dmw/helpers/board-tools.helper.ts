import type { APIRequestContext, APIResponse, Dialog, Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { API로그인, 일회용회원만들기 } from './account.helper.js';
import type { 회원 } from './account.helper.js';
import { 기본배송정보, 배송희망일 } from './data.helper.js';

export interface 글정보 {
  회원: 회원;
  번호: number;
  제목: string;
  본문: string;
}

export interface 글옵션 {
  분류?: string;
  제목?: string;
  본문?: string;
  이미지?: string[];
}

export interface 받은창 {
  종류: string;
  글: string;
}

export function 고유낱말(접두: string): string {
  return `${접두}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function 요청로그인한일회용회원(요청: APIRequestContext, 이름 = '시험회원'): Promise<회원> {
  const 새회원 = await 일회용회원만들기(요청, 이름);
  await API로그인(요청, 새회원.loginId, 새회원.password);
  return 새회원;
}

export async function 글올리기(요청: APIRequestContext, 글: 글옵션 & { 제목: string; 본문: string }): Promise<number> {
  const res = await 요청.post('/api/posts', { data: { category: 글.분류 ?? '자유', title: 글.제목, content: 글.본문, images: 글.이미지 ?? [] } });
  if (res.status() !== 201) throw new Error(`글 올리기 요청이 실패했다: ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { id: number }).id;
}

export async function 일회용회원의글만들기(요청: APIRequestContext, 옵션: 글옵션 = {}): Promise<글정보> {
  const 회원 = await 요청로그인한일회용회원(요청);
  const 제목 = 옵션.제목 ?? 고유낱말('시험글');
  const 본문 = 옵션.본문 ?? '시험으로 쓴 글의 본문입니다 열 글자가 넘습니다';
  const 번호 = await 글올리기(요청, { ...옵션, 제목, 본문 });
  return { 회원, 번호, 제목, 본문 };
}

export async function 로그인상태인가(page: Page, 상태: '비회원' | '회원' | '관리자'): Promise<boolean> {
  const 머리 = new 머리글(page);
  await 머리.그려질때까지();
  if (상태 === '비회원') return 머리.로그인.isVisible();
  if (상태 === '관리자') return 머리.관리자.isVisible();
  return 머리.로그아웃.isVisible();
}

export async function 하위메뉴누르기(page: Page, 메뉴: Locator): Promise<void> {
  const 머리 = new 머리글(page);
  await 머리.그려질때까지();
  if (머리.좁은화면인가()) {
    await 머리.메뉴누르기(메뉴);
    return;
  }
  await 머리.커뮤니티.hover();
  await 메뉴.click();
}

export async function 스크롤멈출때까지(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((끝) => {
        let 앞 = -1;
        let 같은횟수 = 0;
        const 살피기 = (): void => {
          const 지금 = window.scrollY;
          같은횟수 = 지금 === 앞 ? 같은횟수 + 1 : 0;
          앞 = 지금;
          if (같은횟수 >= 8) 끝();
          else requestAnimationFrame(살피기);
        };
        requestAnimationFrame(살피기);
      }),
  );
}

export async function 클립보드준비(page: Page): Promise<() => Promise<string>> {
  await page.addInitScript(() => {
    const 담음 = { 글: '' };
    Object.defineProperty(window, '__복사한글', { get: () => 담음.글 });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (글: string): Promise<void> => {
          담음.글 = 글;
        },
        readText: async (): Promise<string> => 담음.글,
      },
    });
  });
  return () => page.evaluate(() => (window as unknown as { __복사한글: string }).__복사한글);
}

export function 창기록하기(page: Page, 확인할까: () => boolean = () => true): 받은창[] {
  const 받음: 받은창[] = [];
  page.on('dialog', (창: Dialog) => {
    받음.push({ 종류: 창.type(), 글: 창.message() });
    const 답 = 창.type() === 'beforeunload' ? true : 확인할까();
    void (답 ? 창.accept() : 창.dismiss());
  });
  return 받음;
}

export async function 등장시작변환(요소: Locator): Promise<string> {
  return 요소.evaluate((el) => {
    const 이름 = getComputedStyle(el).animationName;
    for (const 시트 of Array.from(document.styleSheets)) {
      for (const 규칙 of Array.from(시트.cssRules)) {
        if (규칙 instanceof CSSKeyframesRule && 규칙.name === 이름) {
          const 처음 = 규칙.findRule('0%') ?? 규칙.findRule('from');
          return 처음 instanceof CSSKeyframeRule ? 처음.style.transform : '';
        }
      }
    }
    return '';
  });
}

const 표 = (() => {
  const 칸: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    칸.push(c >>> 0);
  }
  return 칸;
})();

function 검사합(바이트: Buffer): number {
  let c = 0xffffffff;
  for (const b of 바이트) c = (표[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function 압축없이감싸기(원본: Buffer): Buffer {
  let a = 1;
  let b = 0;
  for (const 바이트 of 원본) {
    a = (a + 바이트) % 65521;
    b = (b + a) % 65521;
  }
  const 길이 = Buffer.alloc(4);
  길이.writeUInt16LE(원본.length, 0);
  길이.writeUInt16LE(~원본.length & 0xffff, 2);
  const 합 = Buffer.alloc(4);
  합.writeUInt32BE(((b << 16) | a) >>> 0);
  return Buffer.concat([Buffer.from([0x78, 0x01, 0x01]), 길이, 원본, 합]);
}

function 덩어리(종류: string, 내용: Buffer): Buffer {
  const 길이 = Buffer.alloc(4);
  길이.writeUInt32BE(내용.length);
  const 이름과내용 = Buffer.concat([Buffer.from(종류, 'ascii'), 내용]);
  const 합 = Buffer.alloc(4);
  합.writeUInt32BE(검사합(이름과내용));
  return Buffer.concat([길이, 이름과내용, 합]);
}

export function 작은그림(색: number = 0, 크기: number = 0): Buffer {
  const 머리 = Buffer.alloc(13);
  머리.writeUInt32BE(1, 0);
  머리.writeUInt32BE(1, 4);
  머리[8] = 8;
  머리[9] = 2;
  const 점 = Buffer.from([0, 색 % 256, (색 * 7) % 256, (색 * 13) % 256]);
  const 그림 = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    덩어리('IHDR', 머리),
    덩어리('IDAT', 압축없이감싸기(점)),
    덩어리('IEND', Buffer.alloc(0)),
  ]);
  return 크기 > 그림.length ? Buffer.concat([그림, Buffer.alloc(크기 - 그림.length)]) : 그림;
}

export function 그림파일(이름: string, 형식: string, 색: number = 0, 크기: number = 0): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 이름, mimeType: 형식, buffer: 작은그림(색, 크기) };
}

export function 그림주소(색: number = 0): string {
  return `data:image/png;base64,${작은그림(색).toString('base64')}`;
}

export function 글번호읽기(page: Page): number {
  const 찾음 = /\/board\/(\d+)/.exec(new URL(page.url()).pathname);
  if (찾음 === null) throw new Error(`주소에서 글 번호를 찾지 못했다: ${page.url()}`);
  return Number(찾음[1]);
}

export interface 바로구매줄 {
  productId: number;
  color: string;
  size: string;
  qty: number;
}

export async function 주문요청(요청: APIRequestContext, 조각: { cartItemIds?: number[]; direct?: 바로구매줄 }): Promise<APIResponse> {
  return 요청.post('/api/orders', {
    data: {
      shipping: { ...기본배송정보, deliveryDate: 배송희망일() },
      payment: { method: '계좌이체', cardCompany: '', installment: '' },
      couponId: '',
      ...조각,
    },
  });
}

export async function 주문취소요청(요청: APIRequestContext, 주문번호: string): Promise<APIResponse> {
  return 요청.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
}
