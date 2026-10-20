// 주소창의 해시를 화면 한 개로 푼다. 서버 라우팅을 건드리지 않으려고 해시를 쓴다
// app.ts의 정적 서빙은 Phase 0가 고정한 공용 골격이라 history API용 되돌림 규칙을 넣을 수 없다

import type { User } from './api.js';
import { 기능보나, type 기능 } from './role.js';

// 사이드바 하위 메뉴(UI 테스트 · 기능 테스트). 종류 없는 옛 주소는 기능이다 — 지금 케이스가 전부 기능이라서 (화면공통 §8 · PR #132)
export type 케이스종류 = 'UI' | 'FN';
const 종류글자: Record<string, 케이스종류> = { ui: 'UI', fn: 'FN' };
// 실행 기록에만 셋째 하위가 있다 — 케이스 목록에는 시나리오가 없다 (도메인/실행 §8.7)
export type 실행종류 = 케이스종류 | 'E2E';
const 실행종류글자: Record<string, 실행종류> = { ...종류글자, e2e: 'E2E' };

export type Route =
  | { name: 'dashboard' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'password' }
  /** 자리 — 설정 안에서 고른 것. 서비스 접두사 · `users` · `pending` · `new`. 없으면 첫 서비스다 (도메인/인증 §8.8) */
  | { name: 'settings'; 자리?: string }
  /** req — 「PRD 관리」에서 넘어온 요구 번호. 그 요구를 덮는 케이스만 거른다 (도메인/카탈로그 §8.1 「맥락」) */
  | { name: 'cases'; kind: 케이스종류; req?: string }
  | { name: 'setup'; tcId: string }
  | { name: 'runs'; kind: 실행종류 }
  | { name: 'scenarios' }
  | { name: 'scenarioNew' }
  | { name: 'scenario'; id: number }
  /** reqId — 케이스 목록의 요구 번호에서 왔다. 그 항목을 펴서 보인다 */
  | { name: 'prd'; reqId?: string }
  | { name: 'prdGuide' }
  /** version — 작성 상세의 「API 문서 버전 N」 자료에서 왔다. 그 버전 원문을 펴서 보인다 (도메인/API §8.13) */
  | { name: 'apiDocs'; version?: number }
  | { name: 'authoring' }
  | { name: 'authoringItem'; id: number }
  | { name: 'run'; runId: number }
  | { name: 'item'; runId: number; historyId: number }
  | { name: 'unknown'; hash: string };

/** 케이스 번호가 말하는 종류 — 서버 catalog/rules `tcId종류` 와 같은 꼴이다 */
export const UI케이스인가 = (tcId: string): boolean => /-UI-\d{3}$/.test(tcId);

/**
 * 실행 기록에서 그 실행을 고른 주소 (도메인/실행 §8.7 「A안」).
 * `카드열기` 를 켜면 그 케이스의 실패 카드가 펼쳐진 채 열린다 — 대시보드 · 항목 상세에서 원인까지 곧장 내려가려고 (도메인/실행 §8.3)
 */
export function 실행기록주소(tcId: string, runId: number, 카드열기 = false): string {
  const 주소 = `#/runs/${UI케이스인가(tcId) ? 'ui' : 'fn'}?run=${String(runId)}`;
  return 카드열기 ? `${주소}&tc=${encodeURIComponent(tcId)}` : 주소;
}

/** 케이스 목록에서 그 케이스 상세를 편 주소 (CaseListFilter 의 `case` 조건) */
export const 케이스주소 = (tcId: string) => `#/cases/${UI케이스인가(tcId) ? 'ui' : 'fn'}?case=${encodeURIComponent(tcId)}`;

/** 「PRD 관리」의 그 항목 주소. 거기서 묶음을 펴고 그 줄로 간다 (도메인/카탈로그 §8.1 「맥락」) */
export const PRD항목주소 = (reqId: string) => `#/prd/${encodeURIComponent(reqId)}`;

/**
 * 주소 조각을 푼다. 깨진 % 꼴(`%` · `%E0`)이면 null — 그 주소는 「없는 주소」다.
 * decodeURIComponent 가 던지면 그리는 도중이라 앱 전체가 빈 화면이 됐다 (2026-10-09 코드 검토)
 */
function 풀기(조각: string): string | null {
  try {
    return decodeURIComponent(조각);
  } catch (err) {
    if (err instanceof URIError) return null;
    throw err;
  }
}

export function route(hash: string): Route {
  // `?` 뒤는 목록 조건이다 — 화면을 고르지 않는다 (leaveGuard 주소고치기 · 공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const parts = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter((part) => part !== '');

  if (parts.length === 1 && parts[0] === 'login') return { name: 'login' };
  if (parts.length === 1 && parts[0] === 'signup') return { name: 'signup' };
  if (parts.length === 1 && parts[0] === 'password') return { name: 'password' };
  if (parts.length === 1 && parts[0] === 'settings') return { name: 'settings' };
  // 고른 자리를 주소에 남긴다 — 새로고침 · 뒤로 가기에 서비스 고른 것이 풀리면 처음 서비스로 튄다
  if (parts.length === 2 && parts[0] === 'settings') {
    const 자리 = 풀기(parts[1]!);
    if (자리 !== null) return { name: 'settings', 자리 };
  }

  // 빈 주소는 집이다. 집이 대시보드가 된 뒤로 route 가 먼저 대시보드로 푼다 — 그 자리가 없는 사람은 `갈자리` 가 다음 집으로 보낸다
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) return { name: 'dashboard' };

  if (parts[0] === 'cases' && parts.length === 1) return { name: 'cases', kind: 'FN' };
  if (parts[0] === 'cases' && parts.length === 2 && 종류글자[parts[1]!] !== undefined) {
    return { name: 'cases', kind: 종류글자[parts[1]!]! };
  }

  if (parts[0] === 'cases' && parts.length === 4 && 종류글자[parts[1]!] !== undefined && parts[2] === 'req') {
    const req = 풀기(parts[3]!);
    if (req !== null) return { name: 'cases', kind: 종류글자[parts[1]!]!, req };
  }

  if (parts[0] === 'cases' && parts.length === 3 && parts[2] === 'run') {
    const tcId = 풀기(parts[1]!);
    if (tcId !== null) return { name: 'setup', tcId };
  }

  if (parts.length === 1 && parts[0] === 'prd') return { name: 'prd' };
  if (parts.length === 2 && parts[0] === 'prd' && parts[1] === 'guide') return { name: 'prdGuide' };
  if (parts[0] === 'api' && parts[1] === 'docs') {
    if (parts.length === 2) return { name: 'apiDocs' };
    // 번호는 숫자 글자만 받는다 — 작성 상세와 같은 규칙
    if (parts.length === 3 && /^[1-9]\d{0,8}$/.test(parts[2]!)) return { name: 'apiDocs', version: Number(parts[2]) };
  }
  // PRD 항목 번호는 늘 `<접두사>-REQ-<3자리>` 다(도메인/작성 §3.6 「칸과 번호」). 그 밖의 꼴은 없는 주소다
  if (parts.length === 2 && parts[0] === 'prd' && /^[A-Z][A-Z0-9]{0,11}-REQ-\d{3}$/.test(parts[1]!)) {
    return { name: 'prd', reqId: parts[1]! };
  }

  // 번호는 숫자 글자만 받는다. 서버도 같은 모양으로 거른다 (도메인/작성 §7) —
  // 문과 라우트가 다른 값을 읽으면 그 틈으로 남의 행을 부르는 주소가 만들어진다
  if (parts[0] === 'authoring') {
    if (parts.length === 1) return { name: 'authoring' };
    if (parts.length === 2 && /^\d{1,10}$/.test(parts[1]!)) {
      return { name: 'authoringItem', id: Number(parts[1]) };
    }
  }

  // 번호 규칙은 작성과 같다 — 서버도 열 자리 숫자 글자만 받는다 (도메인/시나리오 §7)
  if (parts[0] === 'scenarios') {
    if (parts.length === 1) return { name: 'scenarios' };
    if (parts.length === 2 && parts[1] === 'new') return { name: 'scenarioNew' };
    if (parts.length === 2 && /^\d{1,10}$/.test(parts[1]!)) return { name: 'scenario', id: Number(parts[1]) };
  }

  if (parts[0] === 'runs') {
    if (parts.length === 1) return { name: 'runs', kind: 'FN' };
    if (parts.length === 2 && 실행종류글자[parts[1]!] !== undefined) return { name: 'runs', kind: 실행종류글자[parts[1]!]! };

    const runId = Number(parts[1]);
    if (Number.isInteger(runId)) {
      if (parts.length === 2) return { name: 'run', runId };

      const historyId = Number(parts[3]);
      if (parts.length === 4 && parts[2] === 'items' && Number.isInteger(historyId)) {
        return { name: 'item', runId, historyId };
      }
    }
  }

  return { name: 'unknown', hash };
}

/**
 * 목록 화면이 어느 기능에 매였나. 목록만 띠의 서비스를 따른다.
 * 한 건 주소(실행·항목·실행 설정·작성 상세)는 그 건의 서비스가 따로 있어 화면이 판정한다 —
 * 띠로 가르면 B 서비스 실행 알림을 A 를 고른 채 열 때 판정 전에 집으로 튕긴다. 서버가 다시 막는다
 */
const 기능자리: Partial<Record<Route['name'], 기능>> = {
  cases: 'cases',
  // 표준 기획서는 작성 칸을 쓴다 (화면공통 §8 · 도메인/작성 §3.6 「★ 표준 기획서」)
  prd: 'authoring',
  prdGuide: 'authoring',
  // API 문서도 작성이 읽는 기준 문서다 (화면공통 §8 「자리 목록」)
  apiDocs: 'authoring',
  authoring: 'authoring',
  runs: 'runs',
  // 시나리오는 실행 칸을 쓴다 (도메인/시나리오 §7). 새 시나리오는 띠의 서비스에 만든다
  scenarios: 'runs',
  scenarioNew: 'runs',
};

/**
 * 대시보드 자리가 있나. 고른 서비스가 아니라 배정 서비스 **전체**의 실행 칸을 본다 —
 * 여러 서비스를 가로지르는 화면이라 한 서비스의 칸으로 가르면 서비스를 바꿀 때 자리가 깜빡인다 (도메인/리포팅 §8.12)
 */
export function 대시보드보나(user: User | null): boolean {
  return user?.services.some((서비스) => 서비스.permissions.runs !== 'none') ?? false;
}

/**
 * 집. 사이드바 순서와 따로 정한다 (화면공통 §8 「자리 목록」 · 2026-10-13). 대시보드 → 케이스 → 작성 → 실행 기록 순이다.
 * PRD 관리는 같은 작성 칸이라 집이 되지 않는다 — 작성 칸이 있으면 테스트 작성이 집이다.
 *
 * 다 막혔으면 `#/cases` 로 둔다 — 그 사람에게는 껍데기가 「권한을 받지 않았습니다」를 덮어 그린다.
 */
export function 집(user: User, prefix: string | null): string {
  if (대시보드보나(user)) return '#/dashboard';
  const 순서: [기능, string][] = [['cases', '#/cases'], ['authoring', '#/authoring'], ['runs', '#/runs']];
  return 순서.find(([어느]) => 기능보나(user, prefix, 어느))?.[1] ?? '#/cases';
}

/**
 * 이 주소로 가도 되나. `none` 인 자리를 직접 치면 집으로 보낸다 (화면공통 §8).
 * 이유를 띄우지 않는다 — 서비스를 바꾸면 열릴 수 있는 자리라 안내보다 옮기는 편이 덜 헷갈린다
 */
export function 갈자리(hash: string, user: User, prefix: string | null): string {
  if (route(hash).name === 'dashboard') return 대시보드보나(user) ? hash : 집(user, prefix);
  const 어느 = 기능자리[route(hash).name];
  return 어느 === undefined || 기능보나(user, prefix, 어느) ? hash : 집(user, prefix);
}

/**
 * 로그인이 끝나면 어디로 돌려보낼까 (SPEC §8.6).
 *
 * 로그인 화면 자체를 기억하면 로그인 뒤 또 로그인 화면으로 간다. 가입 화면도 로그인한 사람에게는 쓸 데가 없다.
 */
export function 돌아갈자리(hash: string, user: User, prefix: string | null): string {
  const 이름 = route(hash).name;
  if (hash === '' || 이름 === 'login' || 이름 === 'signup') return 집(user, prefix);
  return 갈자리(hash, user, prefix);
}
