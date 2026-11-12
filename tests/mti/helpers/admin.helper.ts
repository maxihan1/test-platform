import type { APIRequestContext } from '@playwright/test';

import { 고유이름, 머리 } from './auth.helper.js';

async function 번호(응답: { status(): number; json(): Promise<unknown> }): Promise<string> {
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export function 시험도메인(): string {
  return `${고유이름('mti-')}.example`;
}

export async function 관리첫번호(admin: APIRequestContext, 경로: string): Promise<string> {
  const 응답 = await admin.get(경로);
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }[])[0]?.id ?? '';
}

export async function 관리도메인차단만들기(admin: APIRequestContext, 도메인 = 시험도메인()): Promise<string> {
  return 번호(await admin.post('/api/v1/admin/domain_blocks', { data: { domain: 도메인, severity: 'noop' } }));
}

export async function 관리도메인허용만들기(admin: APIRequestContext): Promise<string> {
  return 번호(await admin.post('/api/v1/admin/domain_allows', { data: { domain: 시험도메인() } }));
}

export async function 관리이메일도메인차단만들기(admin: APIRequestContext): Promise<string> {
  return 번호(await admin.post('/api/v1/admin/email_domain_blocks', { data: { domain: 시험도메인() } }));
}

export function 시험아이피(): string {
  return `198.51.100.${String(1 + Math.floor(Math.random() * 250))}/32`;
}

export async function 관리아이피차단만들기(admin: APIRequestContext): Promise<string> {
  return 번호(await admin.post('/api/v1/admin/ip_blocks', { data: { ip: 시험아이피(), severity: 'sign_up_block', comment: 'MTI 시험' } }));
}

export async function 관리이메일해시차단만들기(admin: APIRequestContext): Promise<string> {
  return 번호(await admin.post('/api/v1/admin/canonical_email_blocks', { data: { email: `${고유이름('mti')}@example.com` } }));
}

export async function 관리지우기(admin: APIRequestContext, 경로: string, 대상: string): Promise<void> {
  if (대상 !== '') await admin.delete(`${경로}/${대상}`);
}

export async function 신고하기(request: APIRequestContext, 토큰: string, 계정: string, 덧붙임: Record<string, unknown> = {}): Promise<string> {
  return 번호(await request.post('/api/v1/reports', { headers: 머리(토큰), data: { account_id: 계정, comment: 'MTI 시험 신고', category: 'other', ...덧붙임 } }));
}

export async function 신고닫기(admin: APIRequestContext, 신고: string): Promise<void> {
  if (신고 !== '') await admin.post(`/api/v1/admin/reports/${신고}/resolve`);
}
