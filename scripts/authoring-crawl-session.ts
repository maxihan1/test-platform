// 크롤러 인자 · 브라우저 쪽 열기 · 로그인 — 상태마다 상태 파일로 쪽을 열고, 자식의 로그인 스크립트를 역할마다 돌린다 (도메인/작성 §3.6 「화면 구조는 크롤러가 먼저 뽑는다」 · PRD-F9-30)
// authoring-crawl-state.ts 가 300줄을 넘어 뗐다. 계정 값은 읽지 않는다 — 로그인은 자식의 스크립트가 한다
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

import type { Browser, BrowserContext, Page } from '@playwright/test';

import { 환경비밀번호들 } from './authoring-accounts.js';
import type { 상태, 저장본 } from './authoring-screens-keep.js';

export interface 인자 {
  주소들: string[];
  출력: string;
  /** 일반 회원 로그인 상태 파일(`--state`). 없으면 로그아웃만 돈다 */
  상태파일: string | null;
  /** 로그인 상태(`로그인:<역할>`) → 그 역할의 로그인 상태 파일. 크롤러가 역할마다 로그인 스크립트로 만든다 (PRD-F9-30) */
  역할상태: Map<상태, string>;
  /** 자식의 로그인 스크립트 — 로그아웃 · 로그인 풀림 뒤 이것을 다시 돌려 상태 파일을 새로 만든다 (PRD-F6-02) */
  로그인: string | null;
  따라가기: boolean;
  최대: number;
  분: number;
  저장본: 저장본 | null;
  /** 서비스 설정의 훑지 않을 경로 — 이 아래 주소는 열지 않는다 (#153) */
  뺄: string[];
  /** PRD 에 이미 있는 화면의 같은 틀 — 목록 줄에 `덮음: true` 를 단다. 인자가 없으면 null (PRD-F6-03) */
  덮은틀: Set<string> | null;
  /** 같은 틀 → 그 화면을 쓰는 기존 케이스 — 저장본이 바뀐 줄에 `케이스` 를 단다. 인자가 없으면 null (PRD-F6-04) */
  케이스지도: Map<string, string[]> | null;
}

/** 크롤 파일 폴더 — 역할끼리는 `로그인/` 하나를 같이 쓴다(크롤 번호가 상태를 넘어 하나씩 늘어 안 겹친다) */
export const 폴더이름 = (상태: 상태): string => (상태 === '로그아웃' ? '로그아웃' : '로그인');

/** 쪽 하나 — 상태 파일이 없으면 로그아웃이다 */
export async function 새쪽(브라우저: Browser, 상태파일: string | undefined): Promise<{ 맥락: BrowserContext; 쪽: Page }> {
  const 맥락 = await 브라우저.newContext(상태파일 === undefined ? {} : { storageState: 상태파일 });
  // 그림 · 글꼴 · 영상은 받지 않는다 — 구조만 본다
  await 맥락.route('**/*', (r) => (['image', 'font', 'media'].includes(r.request().resourceType()) ? r.abort() : r.continue()));
  const 쪽 = await 맥락.newPage();
  // 브라우저 확인 창은 늘 취소한다 — 탈퇴 · 삭제의 마지막 확인일 수 있다. 떠나기 확인만 받아 다음 화면으로 간다
  쪽.on('dialog', (d) => void (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => undefined));
  // 누르기는 한 쪽에서만 — 스크립트가 띄운 새 창은 닫는다
  맥락.on('page', (p) => void p.close().catch(() => undefined));
  return { 맥락, 쪽 };
}

/**
 * 자식의 로그인 스크립트를 돈다 — 계정은 그 안에서 process.env 로 읽고 입력 직전 출처를 본다(tpx-author reverse.md §2).
 * 역할은 `CRAWL_ROLE`, 쓸 상태 파일은 `CRAWL_STATE` 로 넘긴다 (PRD-F9-30).
 * 그 스크립트가 상태 파일을 새로 써야 한다 — 안 바뀌었으면 실패로 본다. 실패하면 까닭(비밀번호는 가림), 되면 null
 */
export function 로그인돌리기(스크립트: string, 상태파일: string, 역할: string): string | null {
  const 전 = statSync(상태파일, { throwIfNoEntry: false })?.mtimeMs ?? 0;
  const env = { ...process.env, CRAWL_ROLE: 역할, CRAWL_STATE: 상태파일 };
  const r = spawnSync(process.execPath, ['--input-type=module'], { input: readFileSync(스크립트), cwd: process.cwd(), env, timeout: 90_000, encoding: 'utf8' });
  if (r.status !== 0) {
    const 비밀 = 환경비밀번호들(process.env); // 역할 계정까지 — 로그인 스크립트는 환경을 통째로 받는다
    const 끝줄 = `${r.stderr ?? ''}\n${r.stdout ?? ''}`.split('\n').map((x) => x.trim()).filter(Boolean).at(-1) ?? '';
    return `로그인 스크립트가 실패했다(종료 코드 ${r.status ?? '시간 초과'})${끝줄 === '' ? '' : ` — ${비밀.reduce((글, 하나) => 글.split(하나).join('••••••'), 끝줄).slice(0, 200)}`}`;
  }
  if ((statSync(상태파일, { throwIfNoEntry: false })?.mtimeMs ?? 0) <= 전) return '상태 파일이 새로 써지지 않았다 — 로그인 스크립트가 CRAWL_STATE 파일에 쓰는지 본다';
  return null;
}
