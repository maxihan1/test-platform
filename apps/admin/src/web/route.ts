// 주소창의 해시를 화면 한 개로 푼다. 서버 라우팅을 건드리지 않으려고 해시를 쓴다
// app.ts의 정적 서빙은 Phase 0가 고정한 공용 골격이라 history API용 되돌림 규칙을 넣을 수 없다

import type { User } from './api.js';
import { 기능보나, type 기능 } from './role.js';

export type Route =
  | { name: 'login' }
  | { name: 'settings' }
  | { name: 'cases' }
  | { name: 'setup'; tcId: string }
  | { name: 'runs' }
  | { name: 'authoring' }
  | { name: 'authoringItem'; id: number }
  | { name: 'run'; runId: number }
  | { name: 'item'; runId: number; historyId: number }
  | { name: 'unknown'; hash: string };

export function route(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter((part) => part !== '');

  if (parts.length === 1 && parts[0] === 'login') return { name: 'login' };
  if (parts.length === 1 && parts[0] === 'settings') return { name: 'settings' };

  if (parts.length === 0 || (parts[0] === 'cases' && parts.length === 1)) return { name: 'cases' };

  if (parts[0] === 'cases' && parts.length === 3 && parts[2] === 'run') {
    return { name: 'setup', tcId: decodeURIComponent(parts[1]!) };
  }

  // 번호는 숫자 글자만 받는다. 서버도 같은 모양으로 거른다 (도메인/작성 §7) —
  // 문과 라우트가 다른 값을 읽으면 그 틈으로 남의 행을 부르는 주소가 만들어진다
  if (parts[0] === 'authoring') {
    if (parts.length === 1) return { name: 'authoring' };
    if (parts.length === 2 && /^\d{1,10}$/.test(parts[1]!)) {
      return { name: 'authoringItem', id: Number(parts[1]) };
    }
  }

  if (parts[0] === 'runs') {
    if (parts.length === 1) return { name: 'runs' };

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
};

/**
 * 집. 남은 자리 중 맨 위다 (화면공통 §8 「자리 목록」).
 *
 * 다 막혔으면 `#/cases` 로 둔다 — 그 사람에게는 껍데기가 「권한을 받지 않았습니다」를 덮어 그린다.
 */
export function 집(user: User, prefix: string | null): string {
  const 순서: [기능, string][] = [['cases', '#/cases'], ['authoring', '#/authoring'], ['runs', '#/runs']];
  return 순서.find(([어느]) => 기능보나(user, prefix, 어느))?.[1] ?? '#/cases';
}

/**
 * 이 주소로 가도 되나. `none` 인 자리를 직접 치면 집으로 보낸다 (화면공통 §8).
 * 이유를 띄우지 않는다 — 서비스를 바꾸면 열릴 수 있는 자리라 안내보다 옮기는 편이 덜 헷갈린다
 */
export function 갈자리(hash: string, user: User, prefix: string | null): string {
  const 어느 = 기능자리[route(hash).name];
  return 어느 === undefined || 기능보나(user, prefix, 어느) ? hash : 집(user, prefix);
}

/**
 * 로그인이 끝나면 어디로 돌려보낼까 (SPEC §8.6).
 *
 * 로그인 화면 자체를 기억하면 로그인 뒤 또 로그인 화면으로 간다.
 */
export function 돌아갈자리(hash: string, user: User, prefix: string | null): string {
  if (hash === '' || route(hash).name === 'login') return 집(user, prefix);
  return 갈자리(hash, user, prefix);
}
