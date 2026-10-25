import type { APIRequestContext, APIResponse, Page } from '@playwright/test';

import { API로그인, 비밀번호틀리기, 일회용회원만들기, 일회용회원으로로그인, type 회원 } from './account.helper.js';
import { 상품하나주문, 장바구니담기, 주문만들기, 상품목록, 상품읽기, type 상품상세 } from './data.helper.js';

export interface 주문줄 {
  id: string;
  createdAt: number;
  status: string;
  total: number;
  title: string;
}

export interface 배너줄 {
  id: number;
  title: string;
  visible: boolean;
}

export async function 역할로그인(요청: APIRequestContext, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  if (아이디 === undefined || 비밀번호 === undefined) throw new Error('계정 칸이 비었다 — 실행 설정의 계정이 채워져야 한다');
  await API로그인(요청, 아이디, 비밀번호);
}

export async function 주문목록(요청: APIRequestContext, 기간: '1m' | '3m' | 'all'): Promise<주문줄[]> {
  const res = await 요청.get(`/api/orders?period=${기간}`);
  if (!res.ok()) throw new Error(`주문 목록 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: 주문줄[] }).items;
}

export async function 상태별주문번호(요청: APIRequestContext, 상태: string): Promise<string> {
  const 찾음 = (await 주문목록(요청, 'all')).find((줄) => 줄.status === 상태);
  if (찾음 === undefined) throw new Error(`상태가 ${상태} 인 주문을 찾지 못했다`);
  return 찾음.id;
}

export async function 석달넘은주문번호(요청: APIRequestContext): Promise<string> {
  const 석달안 = new Set((await 주문목록(요청, '3m')).map((줄) => 줄.id));
  const 찾음 = (await 주문목록(요청, 'all')).find((줄) => !석달안.has(줄.id));
  if (찾음 === undefined) throw new Error('석 달보다 오래된 주문을 찾지 못했다');
  return 찾음.id;
}

export async function 끝쪽옵션없는상품(요청: APIRequestContext, 최소재고 = 10): Promise<상품상세> {
  const 목록 = (await 상품목록(요청)).filter((하나) => !하나.soldOut && 하나.stock >= 최소재고);
  const 시작 = Math.floor(Math.random() * Math.max(1, 목록.length));
  for (let i = 0; i < 목록.length; i += 1) {
    const 상세 = await 상품읽기(요청, 목록[(시작 + i) % 목록.length].id);
    if (상세.colors.length === 0 && 상세.sizes.length === 0) return 상세;
  }
  throw new Error('옵션 없는 상품을 찾지 못했다');
}

export async function 재고읽기(요청: APIRequestContext, 상품번호: number): Promise<number> {
  return (await 상품읽기(요청, 상품번호)).stock;
}

export function 오늘여덟자리(): string {
  const 지금 = new Date();
  const 두자리 = (n: number): string => String(n).padStart(2, '0');
  return `${지금.getFullYear()}${두자리(지금.getMonth() + 1)}${두자리(지금.getDate())}`;
}

export async function 잠긴일회용회원(요청: APIRequestContext): Promise<회원> {
  const 새회원 = await 일회용회원만들기(요청);
  await 비밀번호틀리기(요청, 새회원.loginId, 5);
  return 새회원;
}

export async function 배너설정읽기(요청: APIRequestContext): Promise<배너줄[]> {
  const res = await 요청.get('/api/admin/banners');
  if (!res.ok()) throw new Error(`배너 설정 읽기 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { items: 배너줄[] }).items;
}

export async function 배너설정돌려놓기(요청: APIRequestContext, 원래: 배너줄[]): Promise<void> {
  const res = await 요청.put('/api/admin/banners', { data: { items: 원래.map((줄) => ({ id: 줄.id, visible: 줄.visible })) } });
  if (!res.ok()) throw new Error(`배너 설정 되돌리기 요청이 실패했다: ${res.status()}`);
}

export async function 공지팝업읽기(요청: APIRequestContext): Promise<boolean> {
  const res = await 요청.get('/api/settings');
  if (!res.ok()) throw new Error(`설정 읽기 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { noticePopup: boolean }).noticePopup;
}

export async function 공지팝업정하기(요청: APIRequestContext, 켜짐: boolean): Promise<void> {
  const res = await 요청.put('/api/admin/settings', { data: { noticePopup: 켜짐 } });
  if (!res.ok()) throw new Error(`설정 바꾸기 요청이 실패했다: ${res.status()}`);
}

export async function 로그인한아이디(요청: APIRequestContext): Promise<string | null> {
  const res = await 요청.get('/api/session');
  if (!res.ok()) throw new Error(`세션 읽기 요청이 실패했다: ${res.status()}`);
  const 몸 = (await res.json()) as { user: { loginId: string } | null };
  return 몸.user === null ? null : 몸.user.loginId;
}

export async function 서로다른상품둘주문(요청: APIRequestContext): Promise<{ id: string; 대표상품명: string }> {
  const 첫상품 = await 끝쪽옵션없는상품(요청);
  const 목록 = (await 상품목록(요청)).filter((하나) => 하나.id !== 첫상품.id && !하나.soldOut && 하나.stock >= 10).reverse();
  for (const 하나 of 목록) {
    const 상세 = await 상품읽기(요청, 하나.id);
    if (상세.colors.length > 0 || 상세.sizes.length > 0) continue;
    const 줄하나 = await 장바구니담기(요청, { productId: 첫상품.id });
    const 줄둘 = await 장바구니담기(요청, { productId: 상세.id });
    const 주문 = await 주문만들기(요청, [줄하나, 줄둘]);
    return { id: 주문.id, 대표상품명: 첫상품.name };
  }
  throw new Error('첫 상품과 다른 옵션 없는 상품을 찾지 못했다');
}

export async function 일회용회원으로주문만들기(page: Page, 수량 = 1): Promise<{ 회원: 회원; 주문번호: string; 상품: 상품상세 }> {
  const 회원 = await 일회용회원으로로그인(page);
  const 상품 = await 끝쪽옵션없는상품(page.request);
  const 주문 = await 상품하나주문(page.request, 상품.id, 수량);
  return { 회원, 주문번호: 주문.id, 상품 };
}

export async function 주문상태읽기(요청: APIRequestContext, 주문번호: string): Promise<string> {
  const res = await 요청.get(`/api/orders/${encodeURIComponent(주문번호)}`);
  if (!res.ok()) throw new Error(`주문 상세 요청이 실패했다: ${res.status()}`);
  return ((await res.json()) as { status: string }).status;
}

export async function 로그인한역할(요청: APIRequestContext): Promise<string | null> {
  const res = await 요청.get('/api/session');
  if (!res.ok()) throw new Error(`세션 읽기 요청이 실패했다: ${res.status()}`);
  const 몸 = (await res.json()) as { user: { role: string } | null };
  return 몸.user === null ? null : 몸.user.role;
}

export async function 가입하기(요청: APIRequestContext, 회원: { loginId: string; password: string; email: string }): Promise<APIResponse> {
  return 요청.post('/api/auth/signup', {
    data: { loginId: 회원.loginId, password: 회원.password, passwordConfirm: 회원.password, name: '시험회원', email: 회원.email, phone: '', birth: '', gender: 'none', interests: [], terms: true, privacy: true, marketing: false },
  });
}

export async function 로그인하기(요청: APIRequestContext, loginId: string, password: string): Promise<APIResponse> {
  return 요청.post('/api/auth/login', { data: { loginId, password, remember: false } });
}

export async function 몸읽기<T>(응답: APIResponse): Promise<T> {
  return (await 응답.json()) as T;
}

export function JSON인가(글: string): boolean {
  try {
    JSON.parse(글);
    return true;
  } catch {
    return false;
  }
}

export async function 화면으로로그인(page: Page, loginId: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
}

export async function 리뷰탭누르기(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /^리뷰/ }).click();
}
