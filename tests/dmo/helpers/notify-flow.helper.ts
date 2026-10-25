import type { Page, Request, Response } from '@playwright/test';

import { 주문상세읽기, 주문상태바꾸기, 상품목록, type 운영상품 } from './ops-data.helper.js';
import { 쿠폰목록 } from './shop-data.helper.js';

export async function 운영지급쿠폰수(회원: Page): Promise<number> {
  return (await 쿠폰목록(회원)).filter((쿠폰) => 쿠폰.label.includes('운영 지급')).length;
}

export async function 내주문(회원: Page): Promise<{ id: string; status: string }[]> {
  const res = await 회원.request.get('/api/orders');
  if (!res.ok()) throw new Error(`GET /api/orders 실패 ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { items: { id: string; status: string }[] }).items;
}

export async function 주문정리(관리자: Page, 주문번호들: string[]): Promise<void> {
  for (const id of 주문번호들) {
    const 상세 = await 주문상세읽기(관리자, id);
    if (상세.status === '결제완료') await 주문상태바꾸기(관리자, id, '주문취소');
  }
}

export async function 담을상품(관리자: Page, 가격상한: number): Promise<운영상품> {
  const 상품 = (await 상품목록(관리자)).find((p) => p.stock >= 5 && p.salePrice < 가격상한);
  if (!상품) throw new Error(`재고 5개 이상이고 ${가격상한}원보다 싼 상품이 없다`);
  return 상품;
}

export function 요청수집(page: Page, 주소조각: string): { 끝날때까지: () => Promise<number> } {
  const 요청들: Request[] = [];
  const 듣기 = (요청: Request): void => {
    if (요청.method() === 'POST' && 요청.url().includes(주소조각)) 요청들.push(요청);
  };
  page.on('request', 듣기);
  return {
    async 끝날때까지(): Promise<number> {
      page.off('request', 듣기);
      await Promise.all(요청들.map((요청) => 요청.response()));
      return 요청들.length;
    },
  };
}

export async function 두프레임기다리기(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))),
  );
}

export async function 관리자세션인가(page: Page): Promise<boolean> {
  return (await page.request.get('/api/ops/summary')).status() === 200;
}

export async function 배너노출바꾸기(관리자: Page, 제목: string, 노출: boolean): Promise<void> {
  const 읽기 = await 관리자.request.get('/api/admin/banners');
  if (!읽기.ok()) throw new Error(`GET /api/admin/banners 실패 ${읽기.status()} ${await 읽기.text()}`);
  const { items } = (await 읽기.json()) as { items: { id: number; title: string; visible: boolean }[] };
  const 바꿈 = items.map((b) => ({ id: b.id, visible: b.title === 제목 ? 노출 : b.visible }));
  const 쓰기 = await 관리자.request.put('/api/admin/banners', { data: { items: 바꿈 } });
  if (!쓰기.ok()) throw new Error(`PUT /api/admin/banners 실패 ${쓰기.status()} ${await 쓰기.text()}`);
}

export async function 홈공지팝업바꾸기(관리자: Page, 켬: boolean): Promise<void> {
  const 쓰기 = await 관리자.request.put('/api/admin/settings', { data: { noticePopup: 켬 } });
  if (!쓰기.ok()) throw new Error(`PUT /api/admin/settings 실패 ${쓰기.status()} ${await 쓰기.text()}`);
}

export { 브라우저 } from './account.helper.js';

export async function 회원상태(관리자: Page, loginId: string): Promise<string> {
  const res = await 관리자.request.get(`/api/ops/users?q=${encodeURIComponent(loginId)}&status=&page=1&size=20`);
  if (!res.ok()) throw new Error(`GET /api/ops/users 실패 ${res.status()} ${await res.text()}`);
  const 회원 = ((await res.json()) as { items: { loginId: string; status: string }[] }).items.find((u) => u.loginId === loginId);
  if (!회원) throw new Error(`운영툴 회원 목록에 ${loginId} 가 없다`);
  return 회원.status;
}

export async function 로그인한아이디(page: Page): Promise<string | null> {
  const res = await page.request.get('/api/session');
  if (!res.ok()) throw new Error(`GET /api/session 실패 ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { user: { loginId: string } | null }).user?.loginId ?? null;
}

export async function 받은알림(회원: Page): Promise<string[]> {
  const res = await 회원.request.get('/api/notifications');
  if (!res.ok()) throw new Error(`GET /api/notifications 실패 ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { items: { message: string }[] }).items.map((n) => n.message);
}

export async function 재고표(관리자: Page): Promise<Map<number, number>> {
  return new Map((await 상품목록(관리자)).map((p) => [p.id, p.stock]));
}

export function 응답기다림(page: Page, 주소조각: string): Promise<Response> {
  return page.waitForResponse((응답) => 응답.request().method() === 'POST' && 응답.url().includes(주소조각));
}

export async function 팝업저장응답상태(page: Page, 켜짐: boolean): Promise<number> {
  return page.evaluate(
    async (값) =>
      (await fetch('/api/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ noticePopup: 값 }) })).status,
    켜짐,
  );
}
