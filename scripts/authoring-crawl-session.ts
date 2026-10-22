// 크롤러 인자 · 브라우저 쪽 열기 · 로그인 — 상태마다 상태 파일로 쪽을 열고, 자식의 로그인 스크립트를 역할마다 돌린다 (도메인/작성 §3.6 「화면 구조는 크롤러가 먼저 뽑는다」 · PRD-F9-30)
// authoring-crawl-state.ts 가 300줄을 넘어 뗐다. 계정 값은 읽지 않는다 — 로그인은 자식의 스크립트가 한다
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

import { type Browser, type BrowserContext, type Page, type Request, devices } from '@playwright/test';

import { API틀, 같은사이트인가 } from '../apps/admin/src/prd/apiMap.js';

import { 환경비밀번호들 } from './authoring-accounts.js';
import type { 본것 } from './authoring-crawl-page.js';
import type { 목록항목 } from './authoring-crawl-rules.js';
import type { 화면차이 } from './authoring-crawl-viewport.js';
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

/** 본 화면 — 크롤러가 화면마다 남기는 것 (authoring-crawl-state.ts 가 300줄을 넘어 여기로 옮겼다) */
export interface 본화면 extends 목록항목 {
  최종: string;
  지문: string;
  글자지문: string;
  짧음: boolean;
  로그인풀림: boolean;
  입력칸: 본것['입력칸'];
  링크수: number;
  /** 모바일로 견준 차이 — 링크로 연 화면만. 못 열었으면 null (PRD-F10-07) */
  모바일?: 화면차이 | null;
}
export interface 연결 { to: string; via: string }
export interface 판 {
  본: 본화면[];
  /** 본 화면 번호 → 나간 연결(키 `to via`) */
  연결: Map<number, Map<string, 연결>>;
  /** 본 화면 번호 → 그 화면을 열 때와 그 화면에서 누를 때 들은 API (PRD-F10-05) */
  API: Map<number, 들은API>;
  걸러짐: Map<string, { 글자: string; 까닭: string }>;
  잘림: number;
  연속오류: number;
  멈춘까닭: string | null;
  누를것: number;
  누름: number;
  다시로그인: number;
}
/** 크롤 파일 폴더 — 역할끼리는 `로그인/` 하나를 같이 쓴다(크롤 번호가 상태를 넘어 하나씩 늘어 안 겹친다) */
export const 폴더이름 = (상태: 상태): string => (상태 === '로그아웃' ? '로그아웃' : '로그인');

/** 들은 API — `방식 주소` → 그 줄. 화면을 열거나 누르기 전에 비운다. 상태는 응답이 오면 붙는다 */
export type 들은API = Map<string, { method: string; url: string; status?: number }>;
export const API상한 = 200; // 화면 하나에서 — 서버 상한과 같다(§7 PUT …/screens)

const API인가 = (r: Request): boolean => ['fetch', 'xhr'].includes(r.resourceType());
const 물음표뺀주소 = (r: Request): string => {
  const u = new URL(r.url());
  u.search = '';
  u.hash = '';
  return u.toString();
};

/**
 * 화면이 부른 API(fetch · xhr)를 듣는다 — 물음표 · # 뒤는 뺀다(토큰 · 검색어). 같은 사이트인지 · 상한은 서버가 다시 거른다 (도메인/작성 §3.6 「서비스 지도」 · PRD-F10-05).
 * 응답 상태도 붙인다 — 보조가 기다릴 응답을 고르는 재료다(PRD-F14-05). 비운 뒤에 온 응답은 앞 화면 몫의 줄에 그대로 붙는다
 */
export function API듣기(쪽: Page, 들은: 들은API): void {
  쪽.on('request', (r) => {
    if (!API인가(r) || 들은.size >= API상한) return;
    const url = 물음표뺀주소(r);
    들은.set(`${r.method()} ${url}`, { method: r.method(), url });
  });
  쪽.on('response', (응답) => {
    const r = 응답.request();
    if (!API인가(r)) return;
    const 줄 = 들은.get(`${r.method()} ${물음표뺀주소(r)}`);
    if (줄 !== undefined) 줄.status = 응답.status();
  });
}

/**
 * 크롤 파일 머리의 `# API:` 줄 — 같은 사이트만 · 서비스 지도와 같은 틀(`:n` · `:id`)로 · 방식과 틀이 같으면 한 줄에 본 상태를 모은다.
 * 훑기 보조가 화면 기록 「부르는 API」로 옮기고 작성 보조가 기다릴 응답을 고른다 — 기대값의 근거가 아니다 (도메인/작성 §3.6 「화면 기록과 크롤러」 · PRD-F14-05)
 */
export function API머리줄(들은: Iterable<{ method: string; url: string; status?: number }>, 기준주소: string): string[] {
  const 모음 = new Map<string, Set<number>>();
  for (const x of 들은) {
    const 틀 = API틀(x.url);
    if (틀 === null || !같은사이트인가(틀.host, 기준주소)) continue;
    const 키 = `${x.method} ${틀.host}${틀.path}`;
    const 상태들 = 모음.get(키) ?? new Set<number>();
    if (x.status !== undefined) 상태들.add(x.status);
    모음.set(키, 상태들);
  }
  return [...모음].map(([키, 상태들]) => `# API: ${키} · ${상태들.size === 0 ? '응답 못 봄' : [...상태들].sort((a, b) => a - b).join(' ')}`);
}
/** 들은 API 를 그 화면(본 화면 번호) 몫에 더한다 — 화면 하나에 상한까지 */
export function API더하기(몫: Map<number, 들은API>, 본번: number, 들은: 들은API): void {
  const 칸 = 몫.get(본번) ?? new Map();
  for (const [키, 값] of 들은) if (칸.size < API상한) 칸.set(키, 값);
  몫.set(본번, 칸);
}

// 실행의 mobile 프로젝트(playwright.config.ts)와 같은 기기 — 크롤러는 chromium 이라 화면 크기 · 터치 · UA 만 흉내 낸다 (PRD-F10-07)
const { defaultBrowserType: _, ...아이폰 } = devices['iPhone 14'];

/** 쪽 하나 — 상태 파일이 없으면 로그아웃이다. 모바일이면 실행 모바일과 같은 기기 크기 · UA 로 연다 */
export async function 새쪽(브라우저: Browser, 상태파일: string | undefined, 모바일 = false): Promise<{ 맥락: BrowserContext; 쪽: Page }> {
  const 맥락 = await 브라우저.newContext({ ...(모바일 ? 아이폰 : {}), ...(상태파일 === undefined ? {} : { storageState: 상태파일 }) });
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
