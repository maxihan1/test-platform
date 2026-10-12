import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { 장바구니담기, 상품목록 } from './shop.helper.js';
import type { 상품 } from './shop.helper.js';

export interface 상품상세 extends 상품 {
  maxQty: number;
  summary: string;
  qna: { question: string; answer: string }[];
}

export interface 자주묻는질문 {
  id: number;
  category: string;
  question: string;
  answer: string;
}

export interface 문의내역 {
  id: number;
  type: string;
  title: string;
  content: string;
  status: string;
}

export async function 세션사용자(api: APIRequestContext): Promise<{ loginId: string } | null> {
  const res = await api.get('/api/session');
  if (!res.ok()) throw new Error(`세션 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { user: { loginId: string } | null }).user;
}

export async function 상품상세조회(api: APIRequestContext, id: number): Promise<상품상세> {
  const res = await api.get(`/api/products/${String(id)}`);
  if (!res.ok()) throw new Error(`상품 상세 조회 실패: ${String(res.status())}`);
  return (await res.json()) as 상품상세;
}

export async function 옵션없는상품(api: APIRequestContext): Promise<상품상세> {
  const { items } = await 상품목록(api);
  for (const 후보 of items.filter((p) => !p.soldOut && p.stock > 10 && p.category !== '패션')) {
    const 상세 = await 상품상세조회(api, 후보.id);
    if (상세.colors === undefined || 상세.colors.length === 0) return 상세;
  }
  throw new Error('옵션 없고 재고가 넉넉한 상품이 없다');
}

export async function 옵션있는상품(api: APIRequestContext): Promise<상품상세> {
  const { items } = await 상품목록(api);
  for (const 후보 of items.filter((p) => !p.soldOut && p.stock > 10 && p.category === '패션')) {
    const 상세 = await 상품상세조회(api, 후보.id);
    if (상세.colors !== undefined && 상세.colors.length > 0 && 상세.sizes !== undefined && 상세.sizes.length > 0) return 상세;
  }
  throw new Error('옵션이 있고 재고가 넉넉한 상품이 없다');
}

export async function 품절상품(api: APIRequestContext): Promise<상품> {
  const 찾은것 = (await 상품목록(api)).items.find((p) => p.soldOut);
  if (찾은것 === undefined) throw new Error('품절 상품이 없다');
  return 찾은것;
}

export async function 재고많은상품(api: APIRequestContext): Promise<상품상세> {
  const 찾은것 = (await 상품목록(api)).items.find((p) => !p.soldOut && p.stock > 10);
  if (찾은것 === undefined) throw new Error('재고가 10개 넘는 상품이 없다');
  return 상품상세조회(api, 찾은것.id);
}

export async function 재고적은상품(api: APIRequestContext): Promise<상품상세> {
  const 찾은것 = (await 상품목록(api)).items.find((p) => !p.soldOut && p.stock > 0 && p.stock < 10);
  if (찾은것 === undefined) throw new Error('재고가 10개보다 적은 상품이 없다');
  return 상품상세조회(api, 찾은것.id);
}

export async function 두줄담기(api: APIRequestContext): Promise<{ 옵션줄: 상품상세; 일반줄: 상품상세; 옵션글: string }> {
  const 옵션줄 = await 옵션있는상품(api);
  const 일반줄 = await 옵션없는상품(api);
  const 색상 = 옵션줄.colors?.[0] ?? '';
  const 사이즈 = 옵션줄.sizes?.[0] ?? '';
  await 장바구니담기(api, { productId: 옵션줄.id, qty: 1, color: 색상, size: 사이즈 });
  await 장바구니담기(api, { productId: 일반줄.id, qty: 1 });
  return { 옵션줄, 일반줄, 옵션글: `${색상} / ${사이즈}` };
}

export async function 자주묻는질문목록(api: APIRequestContext): Promise<자주묻는질문[]> {
  const res = await api.get('/api/faq');
  if (!res.ok()) throw new Error(`FAQ 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: 자주묻는질문[] }).items;
}

export async function 내문의목록(api: APIRequestContext): Promise<문의내역[]> {
  const res = await api.get('/api/inquiries');
  if (!res.ok()) throw new Error(`문의 내역 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: 문의내역[] }).items;
}

export async function 리뷰조회(api: APIRequestContext, 번호: number): Promise<{ 상태: number; 목록: { author: string; rating: number; content: string }[] }> {
  let 상태 = 0;
  for (let 번 = 0; 번 < 6; 번 += 1) {
    const res = await api.get(`/api/products/${String(번호)}/reviews`);
    상태 = res.status();
    if (res.ok()) return { 상태, 목록: ((await res.json()) as { items: { author: string; rating: number; content: string }[] }).items };
  }
  return { 상태, 목록: [] };
}

export function 맞는이름들(상품들: 상품[], 검색어: string): string[] {
  return 상품들.filter((p) => p.name.includes(검색어)).map((p) => p.name);
}

export function 검색어고르기(상품들: 상품[], 조건: { 이상?: number; 이하?: number }): string {
  const 후보 = new Map<string, number>();
  for (const 상품 of 상품들) {
    const 본 = new Set<string>();
    for (let 길이 = 1; 길이 <= 2; 길이 += 1) {
      for (let 시작 = 0; 시작 + 길이 <= 상품.name.length; 시작 += 1) {
        const 조각 = 상품.name.slice(시작, 시작 + 길이);
        if (/^[가-힣]+$/.test(조각)) 본.add(조각);
      }
    }
    for (const 조각 of 본) 후보.set(조각, (후보.get(조각) ?? 0) + 1);
  }
  const 알맞은것 = [...후보.entries()].filter(([, 수]) => 수 >= (조건.이상 ?? 0) && 수 <= (조건.이하 ?? Number.MAX_SAFE_INTEGER));
  if (알맞은것.length === 0) throw new Error('조건에 맞는 검색어가 없다');
  const 기준 = 조건.이상 !== undefined ? 1 : -1;
  알맞은것.sort((가, 나) => (가[1] - 나[1]) * 기준 || 가[0].localeCompare(나[0]));
  return 알맞은것[0]?.[0] ?? '';
}

export function 하나만맞는말(질문들: 자주묻는질문[]): string {
  for (const 질문 of 질문들) {
    for (const 말 of 질문.question.split(/[\s.?,]+/).filter((조각) => 조각.length >= 3)) {
      const 맞는수 = 질문들.filter((다른) => 다른.question.includes(말) || 다른.answer.includes(말)).length;
      if (맞는수 === 1) return 말;
    }
  }
  throw new Error('질문 하나에만 있는 말이 없다');
}

export function 길이맞춘글(접두: string, 길이: number): string {
  return 접두 + '가'.repeat(Math.max(0, 길이 - 접두.length));
}

export function 원(금액: number): string {
  return `${금액.toLocaleString('ko-KR')}원`;
}

export function 요청세기(page: Page, 주소패턴: RegExp): { 수: () => number } {
  let 수 = 0;
  page.on('request', (요청) => {
    if (주소패턴.test(요청.url())) 수 += 1;
  });
  return { 수: () => 수 };
}

function 색숫자(색글: string): number[] {
  return (색글.match(/[\d.]+/g) ?? []).map(Number);
}

export function 빨간색인가(색글: string): boolean {
  const [빨강 = 0, 초록 = 255, 파랑 = 255] = 색숫자(색글);
  return 빨강 >= 150 && 초록 <= 100 && 파랑 <= 100;
}

export function 회색인가(색글: string): boolean {
  const [빨강 = 0, 초록 = 0, 파랑 = 0, 투명도 = 1] = 색숫자(색글);
  return 투명도 > 0 && Math.max(빨강, 초록, 파랑) - Math.min(빨강, 초록, 파랑) <= 30;
}

export async function 오른쪽아래에있는가(page: Page, 요소: Locator): Promise<boolean> {
  const 상자 = await 요소.boundingBox();
  const 화면 = page.viewportSize();
  if (상자 === null || 화면 === null) return false;
  return 상자.x + 상자.width / 2 > 화면.width / 2 && 상자.y + 상자.height / 2 > 화면.height / 2;
}

export function 그림자영역있는가(위젯: Locator): Promise<boolean> {
  return 위젯.evaluate((el) => el.shadowRoot !== null);
}

export async function 기다려보기(기다림: Promise<unknown>): Promise<boolean> {
  try {
    await 기다림;
    return true;
  } catch {
    return false;
  }
}
