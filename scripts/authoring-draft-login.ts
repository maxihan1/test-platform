// PRD 초안 자식을 띄우기 전에 에이전트가 대상 서버에 로그인해 상태 파일을 만든다 — 자식은 계정 없이 그 파일만 불러 로그인 뒤 화면을 연다 (도메인/BTS 「자식」 · BTS-F5-05)
// 로그인 꼴은 성능 페이지 측정과 같다(비밀번호 칸과 그 앞 입력 칸 · Enter) — 같은 서버에 두 길이 다르게 로그인하지 않게
import { chmodSync } from 'node:fs';
import { join } from 'node:path';

import { type Browser, chromium } from '@playwright/test';

import { 아이디칸 } from '../apps/admin/src/perf/pageScript.js';

import { type 대상, 사유거르기 } from './authoring-reverse.js';

/** 자식 임시 폴더에 둘 상태 파일 이름 */
export const 상태파일이름 = 'login-state.json';

export interface 미리로그인입력 {
  기준주소: string;
  /** 화면 기록의 로그인 화면 — 상대 주소 */
  로그인주소: string;
  아이디: string;
  비밀번호: string;
  상태파일: string;
}

/** 미리 로그인할 재료 — 대상 주소 · 로그인 화면 · 계정이 다 있을 때만. 운영 서버 줄은 서버가 계정을 비워 보내 여기서 걸러진다 */
export function 미리로그인재료(t: 대상 | undefined, 로그인주소: string | null | undefined, 임시: string): 미리로그인입력 | null {
  if (!t?.baseUrl || !로그인주소 || !t.loginId || !t.loginPassword) return null;
  return { 기준주소: t.baseUrl, 로그인주소, 아이디: t.loginId, 비밀번호: t.loginPassword, 상태파일: join(임시, 상태파일이름) };
}

/** 로그인해 상태 파일을 쓴다. 되면 null, 못 하면 까닭(비밀번호는 가림) — 못 해도 초안은 로그인 없는 화면만으로 이어 간다 */
export async function 미리로그인(입력: 미리로그인입력): Promise<string | null> {
  // 브라우저를 못 띄워도 던지지 않는다 — 초안은 로그인 없이 이어 간다
  let 브라우저: Browser | undefined;
  try {
    브라우저 = await chromium.launch();
    const 맥락 = await 브라우저.newContext();
    const 쪽 = await 맥락.newPage();
    await 쪽.goto(new URL(입력.로그인주소, 입력.기준주소).toString(), { waitUntil: 'networkidle', timeout: 30_000 });
    const 비번칸 = 쪽.locator('input[type="password"]').first();
    await 쪽.locator(아이디칸).first().fill(입력.아이디, { timeout: 10_000 });
    await 비번칸.fill(입력.비밀번호, { timeout: 10_000 });
    await Promise.all([쪽.waitForNavigation({ timeout: 15_000 }).catch(() => null), 비번칸.press('Enter')]);
    await 쪽.waitForTimeout(1000);
    if (await 쪽.locator('input[type="password"]').first().isVisible()) return '로그인 화면에 머물렀다 — 계정이 맞는지 본다';
    await 맥락.storageState({ path: 입력.상태파일 });
    // 쿠키가 든다 — 자식 uid 로 넘기기 전까지 에이전트만 읽게
    chmodSync(입력.상태파일, 0o600);
    return null;
  } catch (e) {
    return 사유거르기(`로그인하지 못했다 — ${String((e as Error).message ?? e).split('\n')[0]}`, [입력.비밀번호]);
  } finally {
    await 브라우저?.close();
  }
}
