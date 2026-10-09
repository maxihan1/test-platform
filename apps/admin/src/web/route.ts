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
  | { name: 'cases'; kind: 케이스종류 }
  | { name: 'setup'; tcId: string }
  | { name: 'runs'; kind: 실행종류 }
  | { name: 'scenarios' }
  | { name: 'scenarioNew' }
  | { name: 'scenario'; id: number }
  | { name: 'authoring' }
  | { name: 'authoringItem'; id: number }
  | { name: 'run'; runId: number }
  | { name: 'item'; runId: number; historyId: number }
  | { name: 'unknown'; hash: string };

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
  const parts = hash.replace(/^#\/?/, '').split('/').filter((part) => part !== '');

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

  if (parts[0] === 'cases' && parts.length === 3 && parts[2] === 'run') {
    const tcId = 풀기(parts[1]!);
    if (tcId !== null) return { name: 'setup', tcId };
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
 * 집. 남은 자리 중 맨 위다 (화면공통 §8 「자리 목록」). 대시보드 → 케이스 → 작성 → 실행 기록 순이다.
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
