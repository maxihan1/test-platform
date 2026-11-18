import type { Page } from '@playwright/test';

import { IP규칙목록화면 } from '../pages/ip-blocks.page.js';
import { IP규칙폼화면 } from '../pages/ip-block-new.page.js';
import { 가입화면 } from '../pages/sign-up.page.js';
import { 도메인차단확인화면 } from '../pages/domain-block-confirm.page.js';
import { 도메인차단폼화면 } from '../pages/domain-block-new.page.js';
import { 사용자명규칙목록화면 } from '../pages/username-blocks.page.js';
import { 사용자명규칙폼화면 } from '../pages/username-block-form.page.js';
import { 서버상세화면 } from '../pages/instance-detail.page.js';
import { 연합화면 } from '../pages/instances.page.js';
import { 이메일도메인차단목록화면 } from '../pages/email-domain-blocks.page.js';
import { 이메일도메인차단추가화면 } from '../pages/email-domain-block-new.page.js';
import { 초대화면 } from '../pages/invites.page.js';
import { qa_user2되돌리기, 신고닫기 } from './account.helper.js';
import { 고유이름, 신고만들기, type 신고옵션 } from './api.helper.js';
import { 로그인하기, 새창, 새창으로로그인 } from './login.helper.js';

export interface 만든신고 {
  번호: string;
  사유: string;
}

export async function 신고들만들기(page: Page, 아이디: string | undefined, 비밀번호: string | undefined, 개수: number, 옵션: 신고옵션 = {}): Promise<만든신고[]> {
  const 신고자 = await 새창으로로그인(page, 아이디, 비밀번호);
  const 만든 = [];
  try {
    for (let 차례 = 0; 차례 < 개수; 차례 += 1) {
      const 사유 = 옵션.사유 ?? 고유이름('mtor');
      만든.push({ 번호: await 신고만들기(신고자, 'qa_user2', { ...옵션, 사유 }), 사유 });
    }
  } finally {
    await 신고자.context().close();
  }
  return 만든;
}

export async function 신고정리(page: Page, 번호들: string[], 아이디: string | undefined, 비밀번호: string | undefined, 계정되돌리기 = false): Promise<void> {
  if (번호들.length === 0 && !계정되돌리기) return;
  await 로그인하기(page, 아이디, 비밀번호);
  if (계정되돌리기) await qa_user2되돌리기(page);
  await 신고들닫기(page, 번호들);
}

export async function 신고들닫기(page: Page, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) await 신고닫기(page, 번호);
}

export function 열초안에결말(약속: Promise<string>): Promise<string> {
  return Promise.race([약속, new Promise<string>((풀기) => setTimeout(() => 풀기(''), 10_000))]);
}

export function 시험도메인(): string {
  return `${고유이름('mto')}.example`;
}

export function 시험아이피(): string {
  return `198.51.100.${2 + Math.floor(Math.random() * 250)}`;
}

export async function 도메인차단만들기(page: Page, 도메인: string, 심각도?: '제한' | '없음'): Promise<void> {
  const 폼 = new 도메인차단폼화면(page);
  const 연합 = new 연합화면(page);
  await 폼.열기();
  await 폼.차단하기(도메인, 심각도);
  await 연합.알림.글('도메인 차단 처리를 완료했습니다').waitFor();
}

export async function 도메인차단지우기(page: Page, 도메인: string): Promise<void> {
  const 상세 = new 서버상세화면(page);
  if ((await 상세.열기(도메인.toLowerCase())) !== 200) return;
  if (!(await 상세.도메인차단취소.isVisible())) return;
  const 받기 = (창: { accept: () => Promise<void> }): void => void 창.accept();
  page.on('dialog', 받기);
  try {
    await 상세.도메인차단취소.click();
    await new 연합화면(page).제목.waitFor();
  } finally {
    page.off('dialog', 받기);
  }
}

export async function 이메일도메인차단만들기(page: Page, 도메인: string, 승인필요 = false): Promise<void> {
  const 추가 = new 이메일도메인차단추가화면(page);
  await 추가.열기();
  await 추가.검사하기(도메인, 승인필요);
  await 추가.추가하기();
  await new 이메일도메인차단목록화면(page).알림.글('이메일 도메인 차단 규칙을 생성했습니다').waitFor();
}

export async function 사용자명규칙만들기(page: Page, 단어: string, 방식: '일치' | '포함', 승인필요 = false): Promise<void> {
  const 폼 = new 사용자명규칙폼화면(page);
  await 폼.열기();
  await 폼.만들기(단어, 방식, 승인필요);
  await new 사용자명규칙목록화면(page).알림.글('사용자명 규칙을 생성했습니다').waitFor();
}

export async function 아이피규칙만들기(page: Page, 아이피: string, 규칙: '가입 제한' | '가입 차단' | '접근 차단'): Promise<void> {
  const 폼 = new IP규칙폼화면(page);
  await 폼.열기();
  await 폼.만들기(아이피, 규칙);
  await new IP규칙목록화면(page).알림.글('성공적으로 새 IP 규칙을 만들었습니다').waitFor();
}

export async function 아이피규칙지우기(page: Page, 아이피: string): Promise<void> {
  await new IP규칙목록화면(page).지우기(아이피);
}

export async function 초대비활성화(page: Page, 링크: string): Promise<void> {
  const 화면 = new 초대화면(page);
  await 화면.열기();
  const 줄 = 화면.행(링크);
  if ((await 줄.getByRole('link', { name: '비활성화' }).count()) === 0) return;
  await 화면.비활성화하기(링크);
}

export function 변형아이디(단어: string): string {
  return 단어.toUpperCase().replace(/A/g, '4').replace(/E/g, '3');
}

export async function 가입시도(page: Page, 아이디: string, 이메일: string): Promise<{ 창: Page; 화면: 가입화면 }> {
  const 창 = await 새창(page);
  const 화면 = new 가입화면(창);
  await 화면.열기();
  const 연시각 = Date.now();
  await 화면.가입정보적기(아이디, 이메일, `Mto-${고유이름('p')}-9!`, 'MTO 시험 가입 이유');
  await 화면.등록하기누르기(연시각);
  return { 창, 화면 };
}

export async function 도메인감사기록열기(page: Page, 도메인: string): Promise<void> {
  await page.goto(`/admin/instances/${도메인}`);
  await page.getByRole('link', { name: '감사 기록 전체 보기' }).click();
  await page.getByRole('heading', { name: '감사 로그', level: 1 }).waitFor();
}

export async function 정지도메인차단만들기(page: Page, 도메인: string): Promise<void> {
  const 폼 = new 도메인차단폼화면(page);
  const 확인 = new 도메인차단확인화면(page);
  await 폼.열기();
  await 폼.차단하기(도메인, '정지');
  await 확인.제목(도메인).waitFor();
  await 확인.정지하기();
  await new 연합화면(page).제목.waitFor();
}
