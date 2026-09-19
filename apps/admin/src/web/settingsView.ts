// 설정 화면이 하는 판단 (SPEC §8.8). 화면은 그리기만 하고 고를 것은 여기서 정한다

import type { UserRow } from './api.js';

// SPEC §2 의 접두사 모양. 서버 settings/routes.ts 의 `접두사모양` 과 같은 것을 화면이 복사해 둔 자리다
// (CLAUDE.md §2.7 ⑤ — §2 를 고치면 두 곳이 같이 움직인다).
// **화면 코드는 서버 모듈을 import 할 수 없다** — routes.ts 가 fastify 를 끌고 와 브라우저 번들이 깨진다
const 접두사모양 = /^[A-Z][A-Z0-9]{0,11}$/;

/**
 * 접두사를 만들 수 있나 (SPEC §2 · §8.8).
 *
 * **빈 칸은 사유를 내지 않는다.** 아직 타이핑을 안 한 것이지 틀린 것이 아니다 —
 * 칸을 누르자마자 빨간 글자가 뜨면 사람이 자기가 뭘 잘못한 줄 안다 (SPEC §8.2 와 같은 태도).
 */
export function 접두사사유(prefix: string): string | null {
  if (prefix === '') return null;
  if (접두사모양.test(prefix)) return null;
  return '대문자로 시작하는 영문·숫자 12자 이내로 적습니다. 예: PAY · MEM2';
}

/** `#` 이 있든 없든, 대소문자 상관없이 여섯 자리 16진수일 때만 푼다 */
function 색을푼다(hex: string): { r: number; g: number; b: number } | null {
  const 값 = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(값)) return null;
  return {
    r: parseInt(값.slice(0, 2), 16),
    g: parseInt(값.slice(2, 4), 16),
    b: parseInt(값.slice(4, 6), 16),
  };
}

/** WCAG 상대 휘도. 눈이 느끼는 밝기는 채널마다 다르게 실린다 */
function 밝기(값: number): number {
  const c = 값 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * 흰 글자를 올렸을 때의 명암비 (DESIGN.md).
 *
 * **왜 흰 글자 기준인가** — 이 색은 맨 위 띠의 바탕이고 그 위에 서비스 이름이 흰 글자로 올라간다.
 * 색 자체가 예쁜지가 아니라 **그 위의 글자가 읽히는지**를 재는 것이다.
 *
 * 모양이 아니면 21 을 낸다 — 아직 색이 아니므로 「미달」이라고 말하지 않는다.
 */
export function 명암비(hex: string): number {
  const 색 = 색을푼다(hex);
  if (색 === null) return 21;
  const L = 0.2126 * 밝기(색.r) + 0.7152 * 밝기(색.g) + 0.0722 * 밝기(색.b);
  return 1.05 / (L + 0.05);
}

/** DESIGN.md 의 본문 기준. 이 아래면 띠의 흰 글자가 안 읽힌다 */
const 최소명암비 = 4.5;

/**
 * 색이 기준에 못 미치면 사유 (DESIGN.md).
 *
 * **막지 않고 알린다.** 색은 사람이 고르는 것이고, 기준을 아는 사람이 일부러 쓸 수도 있다.
 * 다만 모르고 쓰는 일은 없어야 한다 — DB 의 DEMO 서비스가 `#888888`(3.5)로 들어가 있던 것이
 * 이 장치가 없어서였다 (2026-09-19, ① 에서 넘긴 항목).
 */
export function 색사유(hex: string): string | null {
  const 비 = 명암비(hex);
  if (비 >= 최소명암비) return null;
  return `띠의 흰 글자가 잘 안 보입니다 (명암비 ${비.toFixed(1)} · 기준 ${String(최소명암비)}). 더 진한 색을 고릅니다`;
}

/**
 * Slack 웹훅 칸에 무엇을 적나 (SPEC §8.8).
 *
 * **주소를 되돌려 보여주지 않는다.** 비밀값이라 응답에도 안 담겨 오고(§7),
 * 화면은 설정됐는지만 안다. 그래서 고치는 길이 「바꾸기」가 아니라 「다시 넣기」다.
 */
export function 웹훅칸(hasSlackWebhook: boolean): { 글: string; 버튼: string } {
  return hasSlackWebhook ? { 글: '설정됨', 버튼: '다시 넣기' } : { 글: '없음', 버튼: '넣기' };
}

/**
 * 이 사람이 마지막 운영 계정인가 (SPEC §7 · §8.8).
 *
 * 맞으면 등급을 낮추거나 비활성으로 내리는 길을 **아예 안 그린다** (§3.5 — 흐리게 두지 않는다).
 * 서버도 409 로 막지만 그건 눌러 본 뒤에 오는 답이다.
 *
 * **막지 않으면 설정 자리에 아무도 못 들어가고** 컨테이너 안에서 명령을 쳐야만 풀린다.
 */
export function 마지막운영계정인가(계정들: UserRow[], username: string): boolean {
  const 나 = 계정들.find((it) => it.username === username);
  // 이미 내려가 있는 사람은 내릴 것이 없다
  if (나 === undefined || 나.role !== 'admin' || !나.isActive) return false;
  return 계정들.filter((it) => it.role === 'admin' && it.isActive).length <= 1;
}

const 오류말 : Record<string, string> = {
  PREFIX_TAKEN: '그 접두사는 이미 다른 서비스가 쓰고 있습니다',
  PREFIX_SHAPE: '접두사 모양이 다릅니다. 대문자로 시작하는 영문·숫자 12자 이내입니다',
  PREFIX_IMMUTABLE: '접두사는 만든 뒤에 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다',
  USERNAME_TAKEN: '그 아이디는 이미 있습니다',
  LAST_ADMIN: '마지막 운영 계정입니다. 먼저 다른 사람을 운영으로 올립니다',
  NOT_FOUND: '그 항목을 찾지 못했습니다. 다른 사람이 지웠을 수 있습니다',
  INVALID_REQUEST: '넣은 값 중에 모양이 다른 것이 있습니다',
};

/**
 * 서버가 낸 코드를 사람이 읽을 문장으로 (CLAUDE.md §4).
 *
 * **모르는 코드는 삼키지 않는다.** 코드를 그대로 붙여 준다 —
 * 「알 수 없는 오류」만 띄우면 무엇이 틀렸는지 알 길이 사라진다 (CLAUDE.md §3 에러 규칙).
 */
export function 설정오류문장(code: string): string {
  return 오류말[code] ?? `처리하지 못했습니다 (${code})`;
}
