import type { Page } from '@playwright/test';

export async function 스폰지우기(page: Page, 키: string, 아이디: string): Promise<void> {
  const 응답 = await page.request.delete(`/admin/spawns/${encodeURIComponent(아이디)}`, { headers: { 'X-Admin-Key': 키 } });
  if (!응답.ok() && 응답.status() !== 404) throw new Error(`스폰 ${아이디} 를 지우지 못했다 — 응답 ${응답.status()}`);
}

export async function 결과고정풀기(page: Page, 키: string): Promise<void> {
  const 응답 = await page.request.delete('/admin/forced', { headers: { 'X-Admin-Key': 키 } });
  if (!응답.ok()) throw new Error(`결과 고정 대기열을 비우지 못했다 — 응답 ${응답.status()}`);
}

export function 새스폰아이디(): string {
  return `ASO${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
