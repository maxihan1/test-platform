import type { APIRequestContext } from '@playwright/test';

export async function 배송중주문번호(api: APIRequestContext): Promise<string> {
  const res = await api.get('/api/orders?period=all');
  if (!res.ok()) throw new Error(`주문 목록 조회 실패: ${String(res.status())}`);
  const 찾은것 = ((await res.json()) as { items: { id: string; status: string }[] }).items.find((주문) => 주문.status === '배송중');
  if (찾은것 === undefined) throw new Error('배송중 주문이 없다');
  return 찾은것.id;
}

export async function 주문상태(api: APIRequestContext, 주문번호: string): Promise<string> {
  const res = await api.get(`/api/orders/${encodeURIComponent(주문번호)}`);
  if (!res.ok()) throw new Error(`주문 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { status: string }).status;
}

export async function 주문첫상품이름(api: APIRequestContext, 주문번호: string): Promise<string> {
  const res = await api.get(`/api/orders/${encodeURIComponent(주문번호)}`);
  if (!res.ok()) throw new Error(`주문 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { lines: { name: string }[] }).lines[0]?.name ?? '';
}

export interface 배너상태 {
  id: number;
  visible: boolean;
}

export async function 배너상태들(api: APIRequestContext): Promise<배너상태[]> {
  const res = await api.get('/api/admin/banners');
  if (!res.ok()) throw new Error(`배너 관리 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: 배너상태[] }).items.map((배너) => ({ id: 배너.id, visible: 배너.visible }));
}

export async function 배너되돌리기(api: APIRequestContext, 원본: 배너상태[]): Promise<void> {
  const res = await api.put('/api/admin/banners', { data: { items: 원본 } });
  if (!res.ok()) throw new Error(`배너 되돌리기 실패: ${String(res.status())}`);
}

export async function 노출배너제목들(api: APIRequestContext): Promise<string[]> {
  const res = await api.get('/api/banners');
  if (!res.ok()) throw new Error(`노출 배너 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: { title: string }[] }).items.map((배너) => 배너.title);
}

export async function 공지팝업켜졌나(api: APIRequestContext): Promise<boolean> {
  const res = await api.get('/api/settings');
  if (!res.ok()) throw new Error(`설정 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { noticePopup: boolean }).noticePopup;
}

export async function 공지팝업정하기(api: APIRequestContext, 켬: boolean): Promise<void> {
  const res = await api.put('/api/admin/settings', { data: { noticePopup: 켬 } });
  if (!res.ok()) throw new Error(`공지 팝업 설정 실패: ${String(res.status())}`);
}

export function 아이디순서(아이디들: string[], 방향: 1 | -1): boolean {
  return 아이디들.every((값, 번째) => 번째 === 0 || 방향 * (아이디들[번째 - 1] ?? '').localeCompare(값, 'ko') <= 0);
}

export function 석달전날짜(): string {
  const 날 = new Date();
  날.setHours(12, 0, 0, 0);
  날.setMonth(날.getMonth() - 3);
  return `${String(날.getFullYear())}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;
}
