import type { Page } from '@playwright/test';

import { 조치화면 } from '../pages/account-action.page.js';
import { 계정상세화면 } from '../pages/account-detail.page.js';
import { 계정목록화면 } from '../pages/account-list.page.js';
import { 서버상세화면 } from '../pages/instance-detail.page.js';
import { 신고상세화면 } from '../pages/report-detail.page.js';
import { 서버설정화면 } from '../pages/settings.page.js';
import { 가입화면 } from '../pages/sign-up.page.js';
import { 계정번호, 고유이름, 토큰 } from './api.helper.js';
import { 새창 } from './login.helper.js';

export interface 일회용계정 {
  아이디: string;
  이메일: string;
  암호: string;
}

async function 다시그려질때까지(page: Page, 화면: 계정상세화면): Promise<void> {
  await page.waitForLoadState('load');
  await 화면.제목.waitFor();
}

export async function qa_user2되돌리기(page: Page): Promise<void> {
  const 화면 = new 계정상세화면(page);
  const 번호 = await 계정번호(page, 'qa_user2');
  const 받기 = (창: { accept: () => Promise<void> }): void => void 창.accept();
  page.on('dialog', 받기);
  try {
    await 화면.열기(번호);
    for (const 버튼 of [화면.정지해제, 화면.제한해제, 화면.동결해제, 화면.민감함취소]) {
      if (await 버튼.isVisible()) {
        await 버튼.click();
        await 다시그려질때까지(page, 화면);
        await 화면.열기(번호);
      }
    }
    if (!(await 화면.역할칸.innerText()).includes('할당된 역할 없음')) {
      await 화면.역할변경.click();
      await page.getByRole('combobox').first().selectOption({ label: '역할 없음' });
      await page.getByRole('button', { name: '변경 사항을 저장' }).click();
      await page.waitForLoadState('load');
    }
  } finally {
    page.off('dialog', 받기);
  }
}

export async function 일회용계정만들기(page: Page, 이유?: string): Promise<일회용계정> {
  const 아이디 = 고유이름('mto');
  const 계정 = { 아이디, 이메일: `${아이디}@maxihan.com`, 암호: `Mto-${고유이름('p')}-9!` };
  const 창 = await 새창(page);
  try {
    const 가입 = new 가입화면(창);
    await 가입.열기();
    const 연시각 = Date.now();
    await 가입.가입정보적기(계정.아이디, 계정.이메일, 계정.암호, 이유);
    await 가입.등록하기누르기(연시각);
    if (new URL(창.url()).pathname.startsWith(가입화면.주소)) {
      throw new Error(`일회용 계정 가입이 안 됐다 — ${(await 창.locator('body').innerText()).slice(0, 200)}`);
    }
  } finally {
    await 창.context().close();
  }
  return 계정;
}

export async function 승인대기계정만들기(page: Page, 이유 = 'MTO 시험 가입 이유'): Promise<일회용계정> {
  const 설정 = new 서버설정화면(page);
  await 설정.가입방식바꾸기('가입하려면 승인이 필요함');
  try {
    return await 일회용계정만들기(page, 이유);
  } finally {
    await 설정.가입방식바꾸기('누구나 가입 할 수 있음');
  }
}

export async function 상세열기(page: Page, 아이디: string): Promise<void> {
  const 목록 = new 계정목록화면(page);
  await 목록.아이디로찾기(아이디);
  await 목록.계정이름링크(아이디).click();
  await new 계정상세화면(page).제목.waitFor();
}

export async function 계정지우기(page: Page, 아이디: string): Promise<void> {
  const 목록 = new 계정목록화면(page);
  await 목록.아이디로찾기(아이디);
  if ((await 목록.행(아이디).count()) === 0) {
    await 목록.열기(`origin=local&status=pending&username=${아이디}`);
    if ((await 목록.행(아이디).count()) === 0) return;
  }
  await 목록.계정이름링크(아이디).click();
  const 상세 = new 계정상세화면(page);
  await 상세.제목.waitFor();
  const 받기 = (창: { accept: () => Promise<void> }): void => void 창.accept();
  page.on('dialog', 받기);
  try {
    if (await 상세.거부.isVisible()) {
      await 상세.거부.click();
      await page.waitForLoadState('load');
      return;
    }
    if (await 상세.정지.isVisible()) {
      await 상세.정지.click();
      const 조치 = new 조치화면(page);
      await 조치.그려질때까지();
      await 조치.조치하기('정지', false);
      await 상세.제목.waitFor();
    }
    if (await 상세.데이터삭제.isVisible()) {
      await 상세.데이터삭제.click();
      await page.waitForLoadState('load');
    }
  } finally {
    page.off('dialog', 받기);
  }
}

export async function 신고닫기(page: Page, 신고번호: string): Promise<void> {
  const 화면 = new 신고상세화면(page);
  if ((await 화면.열기(신고번호)) !== 200) return;
  if (await 화면.해결로표시.isVisible()) {
    await 화면.해결로표시.click();
    await page.waitForLoadState('load');
  }
}

export async function 도메인차단없는리모트계정(page: Page): Promise<string> {
  const 목록 = new 계정목록화면(page);
  const 서버 = new 서버상세화면(page);
  await 목록.열기('origin=remote');
  await 목록.행들.first().waitFor();
  const 아이디들 = (await 목록.행아이디들.allInnerTexts()).map((글) => 글.trim().replace(/^@/, ''));
  for (const 아이디 of 아이디들) {
    const 도메인 = 아이디.slice(아이디.lastIndexOf('@') + 1).toLowerCase();
    if ((await 서버.열기(도메인)) !== 200) continue;
    if ((await 서버.도메인차단수정.isVisible()) || (await 서버.도메인차단취소.isVisible())) continue;
    return 아이디;
  }
  return '';
}

export async function 공개글고르기(page: Page, 아이디: string): Promise<string> {
  const 번호 = await 계정번호(page, 아이디);
  const 응답 = await page.request.get(`/api/v1/accounts/${번호}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`, {
    headers: { Authorization: `Bearer ${await 토큰(page)}` },
  });
  if (!응답.ok()) throw new Error(`${아이디} 게시물 목록을 읽지 못했다 — ${응답.status()}`);
  const 글들 = (await 응답.json()) as { id: string; in_reply_to_id: string | null; visibility: string }[];
  return 글들.find((글) => 글.in_reply_to_id === null && 글.visibility !== 'direct')?.id ?? '';
}
