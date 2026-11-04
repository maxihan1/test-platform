// 주소가 가리키는 애플리케이션을 읽고, 애플리케이션을 바꿀 때 주소의 그 표시를 고친다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)

import type { ServiceRow, User } from './api.js';
import { 기능보나 } from './role.js';
import { route, 기능자리 } from './route.js';

/** 대시보드가 써 온 애플리케이션 번호 꼴(`service=12`). 번호가 아니면 null */
export function 서비스번호꼴(글: string | null): number | null {
  return 글 !== null && /^[1-9]\d{0,9}$/.test(글) ? Number(글) : null;
}

// 주소가 애플리케이션을 가리키면 그 배정(배정에 없으면 null), 안 가리키면 null.
// 가리키는 것은 요구 번호의 접두사와 `service=` 칸이다(접두사 · 번호 꼴 모두 — 붙여 둔 고리가 썩으면 안 된다). 대시보드의 「전체」(`all`)는 아무것도 안 가리킨다
function 가리킨것(주소: string, user: User): { 배정: ServiceRow | null } | null {
  const 지금 = route(주소);
  const 글 =
    지금.name === 'prd' && 지금.reqId !== undefined
      ? 지금.reqId.slice(0, 지금.reqId.indexOf('-REQ-'))
      : new URLSearchParams(주소.split('?')[1] ?? '').get('service');
  if (글 === null || 글 === 'all') return null;
  const 번호 = 서비스번호꼴(글);
  return { 배정: user.services.find((service) => service.prefix === 글 || service.id === 번호) ?? null };
}

// 그 애플리케이션에서 이 화면의 칸이 none 이 아닌가. 칸이 none 인 애플리케이션으로 띠를 옮기면 집으로 튕겨 링크가 가리킨 화면을 아예 못 본다
function 볼수있나(주소: string, 배정: ServiceRow, user: User): boolean {
  const 어느 = 기능자리[route(주소).name];
  return 어느 === undefined || 기능보나(user, 배정.prefix, 어느);
}

/**
 * 주소가 가리키는 애플리케이션 가운데 연 사람이 그 화면을 볼 수 있는 것. 못 보거나 안 가리키면 null — 띠를 그대로 둔다.
 * 실패 카드는 다른 서비스 실행에서도 요구 · 결정 필요 고리를 걸고, 받은 링크는 받은 사람이 고른 것과 다를 수 있다
 */
export function 주소의서비스(주소: string, user: User): string | null {
  const 배정 = 가리킨것(주소, user)?.배정 ?? null;
  return 배정 !== null && 볼수있나(주소, 배정, user) ? 배정.prefix : null;
}

/**
 * 주소가 지금 것과 다른 애플리케이션을 가리켰는데 연 사람이 거기서 그 화면을 못 보나. 띠를 그대로 두고 안내 한 줄을 띄운다.
 * 대시보드는 안 띄운다 — 못 보는 번호면 대시보드가 「전체」로 되돌려(도메인/리포팅 §8.12) 「지금 고른 애플리케이션으로 엽니다」가 틀린 말이 된다
 */
export function 링크를못보나(주소: string, user: User, 지금: string | null): boolean {
  if (route(주소).name === 'dashboard') return false;
  const 것 = 가리킨것(주소, user);
  if (것 === null) return false;
  return 것.배정 === null || (것.배정.prefix !== 지금 && !볼수있나(주소, 것.배정, user));
}

/**
 * 애플리케이션을 바꿀 때 주소의 애플리케이션 표시를 새 것으로 고친 주소. 안 고치면 새로고침 · 뒤로 가기가 띠를 앞 애플리케이션으로 되돌린다.
 * 설정은 자리가 애플리케이션이다 — 보던 애플리케이션의 설정이면 따라가고, 설정 메뉴로 다른 것을 골라 둔 것은 그대로 둔다.
 * 대시보드는 자기 고르개가 그 칸을 번호로 고친다
 */
export function 서비스바꾼주소(주소: string, 앞: string | null, 접두사: string): string {
  const 지금 = route(주소);
  if (지금.name === 'settings') return 지금.자리?.toUpperCase() === 앞 ? `#/settings/${encodeURIComponent(접두사)}` : 주소;
  const 자리 = 주소.indexOf('?');
  if (자리 === -1 || 지금.name === 'dashboard') return 주소;
  const 조건 = new URLSearchParams(주소.slice(자리 + 1));
  if (!조건.has('service')) return 주소;
  조건.set('service', 접두사);
  return `${주소.slice(0, 자리)}?${조건.toString()}`;
}

/**
 * 자리 없이 연 설정(`#/settings`)을 연 애플리케이션 자리로 채운 주소. 그 주소를 보내면 받은 사람도 같은 설정을 연다.
 * 화면이 스스로 옮기는 주소라 기록을 덮어쓴다 — 채우기 전과 뒤(새로고침)가 같은 화면이어야 띠를 바꿀 때 다르게 굴지 않는다
 */
export function 설정자리채운주소(주소: string, 접두사: string | null): string {
  const 지금 = route(주소);
  return 지금.name === 'settings' && 지금.자리 === undefined && 접두사 !== null ? `#/settings/${encodeURIComponent(접두사)}` : 주소;
}
