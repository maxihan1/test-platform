import type { Page } from '@playwright/test';

import { 조치화면 } from '../pages/account-action.page.js';
import { 계정상세화면 } from '../pages/account-detail.page.js';
import { 계정목록화면 } from '../pages/account-list.page.js';
import { 상세열기 } from './account.helper.js';
import { 고유이름, 토큰 } from './api.helper.js';

export type 조치유형 = 'none' | 'disable' | 'sensitive' | 'silence' | 'suspend';

const 유형이름 = { none: '경고 보내기', disable: '동결', sensitive: '민감함', silence: '제한', suspend: '정지' } as const;

export async function 조치취하기(page: Page, 계정번호: string, 유형: 조치유형, 커스텀?: string): Promise<void> {
  const 화면 = new 조치화면(page);
  await 화면.열기(계정번호, 유형);
  await 화면.조치하기(유형이름[유형], false, 커스텀);
}

export async function 계정정지하기(page: Page, 아이디: string): Promise<void> {
  await 상세열기(page, 아이디);
  const 상세 = new 계정상세화면(page);
  await 상세.정지.click();
  const 조치 = new 조치화면(page);
  await 조치.그려질때까지();
  await 조치.조치하기('정지', false);
  await 상세.제목.waitFor();
}

export async function 참고사항지우기(page: Page, 계정번호: string, 글: string): Promise<void> {
  const 상세 = new 계정상세화면(page);
  await 상세.열기(계정번호);
  const 삭제 = 상세.참고사항삭제(글);
  if ((await 삭제.count()) === 0) return;
  const 받기 = (창: { accept: () => Promise<void> }): void => void 창.accept();
  page.on('dialog', 받기);
  try {
    await 삭제.first().click();
    await page.waitForLoadState('load');
  } finally {
    page.off('dialog', 받기);
  }
}

export async function 게시물채우기(page: Page, 개수: number): Promise<string[]> {
  const 인증 = { Authorization: `Bearer ${await 토큰(page)}` };
  const 머리 = 고유이름('mto');
  return Promise.all(
    Array.from({ length: 개수 }, async (_, 순번) => {
      const 응답 = await page.request.post('/api/v1/statuses', {
        headers: { ...인증, 'Idempotency-Key': `${머리}-${순번}` },
        data: { status: `MTO 시험 게시물 ${머리} ${순번}`, visibility: 'unlisted' },
      });
      if (!응답.ok()) throw new Error(`게시물 ${순번 + 1}번째를 쓰지 못했다 — ${응답.status()}`);
      return ((await 응답.json()) as { id: string }).id;
    }),
  );
}

export async function 게시물지우기(page: Page, 번호들: string[]): Promise<void> {
  const 인증 = { Authorization: `Bearer ${await 토큰(page)}` };
  await Promise.all(번호들.map((번호) => page.request.delete(`/api/v1/statuses/${번호}`, { headers: 인증 })));
}

export async function 대기계정상세열기(page: Page, 아이디: string): Promise<void> {
  const 목록 = new 계정목록화면(page);
  await 목록.열기(`origin=local&status=pending&username=${아이디}`);
  await 목록.계정이름링크(아이디).click();
  await new 계정상세화면(page).제목.waitFor();
}
