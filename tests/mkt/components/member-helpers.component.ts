import type { APIRequestContext, BrowserContext, Download, Locator, Page, Route } from '@playwright/test';

import { 장바구니담기, 장바구니비우기, 장바구니주문, 상품조회 } from './data.component.js';

const 취소용상품번호 = 6;

export class 마이페이지메뉴 {
  readonly 영역: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('navigation', { name: '마이페이지 메뉴' });
  }

  링크(이름: string): Locator {
    return this.영역.getByRole('link', { name: 이름, exact: true });
  }
}

export async function 결제완료주문만들기(api: APIRequestContext): Promise<{ 주문번호: string; 상품: number; 재고전: number }> {
  const 상품 = 취소용상품번호;
  const 재고전 = (await 상품조회(api, 상품)).stock;
  await 장바구니비우기(api);
  await 장바구니담기(api, 상품, 1);
  const 주문 = await 장바구니주문(api);
  return { 주문번호: 주문.id, 상품, 재고전 };
}

export async function 주문대표상품명(api: APIRequestContext, 주문번호: string): Promise<string> {
  const res = await api.get(`/api/orders/${encodeURIComponent(주문번호)}`);
  const 본문 = (await res.json()) as { lines: { name: string }[] };
  const 첫째 = 본문.lines[0];
  if (!첫째) throw new Error(`주문 ${주문번호} 에 상품이 없다`);
  return 본문.lines.length > 1 ? `${첫째.name} 외 ${본문.lines.length - 1}건` : 첫째.name;
}

export async function 주문상태(api: APIRequestContext, 주문번호: string): Promise<string> {
  const res = await api.get(`/api/orders/${encodeURIComponent(주문번호)}`);
  const 본문 = (await res.json()) as { status: string };
  return 본문.status;
}

export function 가짜주문목록응답(): { items: { id: string; createdAt: number; status: string; total: number; title: string }[]; total: number; page: number; size: number } {
  const 지금 = Date.now();
  const 상태들 = ['결제완료', '배송중', '배송완료', '주문취소'];
  const items = 상태들.map((status, i) => ({
    id: `DM99990101-000${i + 1}`,
    createdAt: 지금 - i * 86_400_000,
    status,
    total: 10_000 * (i + 1),
    title: `모킹 상품 ${i + 1}`,
  }));
  return { items, total: items.length, page: 1, size: items.length };
}

export function 빨간색인가(색: string): boolean {
  const 값 = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(색);
  if (!값) return false;
  return Number(값[1]) >= 150 && Number(값[2]) <= 100 && Number(값[3]) <= 100;
}

export function 바이트수(데이터주소: string): number {
  const 본문 = 데이터주소.split(',')[1] ?? '';
  const 덧붙임 = 본문.endsWith('==') ? 2 : 본문.endsWith('=') ? 1 : 0;
  return (본문.length * 3) / 4 - 덧붙임;
}

export function 오늘날짜8자리(): string {
  const 지금 = new Date();
  const 두자리 = (n: number) => String(n).padStart(2, '0');
  return `${지금.getFullYear()}${두자리(지금.getMonth() + 1)}${두자리(지금.getDate())}`;
}

export async function 내려받은첫줄(내려받기: Download): Promise<string> {
  const 흐름 = await 내려받기.createReadStream();
  const 조각들: Buffer[] = [];
  for await (const 조각 of 흐름) 조각들.push(Buffer.from(조각 as Uint8Array));
  const 글 = Buffer.concat(조각들).toString('utf8').replace(/^﻿/, '');
  return 글.split(/\r?\n/)[0] ?? '';
}

export interface 배너 {
  id: number;
  title: string;
  visible: boolean;
}

export async function 배너읽기(api: APIRequestContext): Promise<배너[]> {
  const res = await api.get('/api/admin/banners');
  const 본문 = (await res.json()) as { items: 배너[] };
  return 본문.items;
}

export async function 배너되돌리기(api: APIRequestContext, 원래: 배너[]): Promise<void> {
  await api.put('/api/admin/banners', { data: { items: 원래.map((b) => ({ id: b.id, visible: b.visible })) } });
}

export async function 공지팝업읽기(api: APIRequestContext): Promise<boolean> {
  const res = await api.get('/api/settings');
  const 본문 = (await res.json()) as { noticePopup: boolean };
  return 본문.noticePopup;
}

export async function 공지팝업되돌리기(api: APIRequestContext, 값: boolean): Promise<void> {
  await api.put('/api/admin/settings', { data: { noticePopup: 값 } });
}

export async function 로그인쿠키만료(문맥: BrowserContext): Promise<number | undefined> {
  const 쿠키 = (await 문맥.cookies()).find((c) => c.name === 'dm_sid');
  return 쿠키?.expires;
}

export function 만료까지남은일수(만료: number | undefined): number | undefined {
  if (만료 === undefined || 만료 < 0) return 만료;
  return Math.round((만료 * 1000 - Date.now()) / 86_400_000);
}

export function 한달전날짜(): string {
  const 날 = new Date();
  날.setMonth(날.getMonth() - 1);
  const 두자리 = (n: number) => String(n).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

export async function 주문목록가짜로바꾸기(문맥: BrowserContext): Promise<() => Promise<void>> {
  const 패턴 = /\/api\/orders\?period=/;
  const 처리 = async (길: Route): Promise<void> => {
    await 길.fulfill({ json: 가짜주문목록응답() });
  };
  await 문맥.route(패턴, 처리);
  return async () => {
    await 문맥.unroute(패턴, 처리);
  };
}
