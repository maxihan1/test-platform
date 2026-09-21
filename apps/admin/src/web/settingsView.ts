// 설정 화면이 하는 판단 (SPEC §8.8). 화면은 그리기만 하고 고를 것은 여기서 정한다

import type { EnvRow, UserRow } from './api.js';
import { 요청오류문장 } from './errorText.js';

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
 * 흰 면 위에 놓았을 때의 명암비 (DESIGN.md).
 *
 * **왜 흰 면 기준인가** — 이 색은 자리 넷 줄의 8px 네모와 그 줄 아래 3px 경계선이고,
 * 둘 다 기록지 면(`--sheet`) 위에 놓인다. 색 자체가 예쁜지가 아니라
 * **그 면 위에서 구분되는지**를 재는 것이다.
 *
 * **2026-09-21 에 재는 대상이 바뀌었다.** 그 전에는 띠 바탕이 이 색이고 그 위에 흰 글자가
 * 올라갔다. 띠를 고정색(`--chrome`)으로 바꾸면서 색 표시를 흰 면으로 내렸다 (SPEC §8).
 * 셈은 그대로다 — 흰색과의 대비라는 점이 같아서 식을 안 고쳤다.
 *
 * 모양이 아니면 21 을 낸다 — 아직 색이 아니므로 「미달」이라고 말하지 않는다.
 */
export function 명암비(hex: string): number {
  const 색 = 색을푼다(hex);
  if (색 === null) return 21;
  const L = 0.2126 * 밝기(색.r) + 0.7152 * 밝기(색.g) + 0.0722 * 밝기(색.b);
  return 1.05 / (L + 0.05);
}

/**
 * DESIGN.md 의 UI 요소 기준. 이 아래면 흰 면 위에서 네모와 경계선이 안 보인다.
 *
 * **2026-09-21 에 4.5 에서 3 으로 내렸다.** 글자가 아니라 UI 요소가 됐기 때문이다 (WCAG 2.1 AA).
 * 기준이 **같은 방향으로 느슨해졌을 뿐**이라 지금 DB 에 있는 색은 하나도 안 깨진다 —
 * 옛 기준(4.5)을 통과하는데 이 기준(3)에 미달하는 색은 없다.
 */
const 최소명암비 = 3;

/**
 * 새 서비스에 먼저 넣어 두는 색 (명암비 5.68).
 *
 * **여기 한 곳에만 적는다.** 설정 화면과 `scripts/add-service.ts` 가 둘 다 이것을 쓴다 —
 * 두 곳에 적으면 한쪽만 고치는 날이 오고, 그때 한쪽이 기준 미달 색을 다시 만들기 시작한다.
 * 실제로 옛 값 `#5B7FDE`(3.79)가 그렇게 들어가 있었다 (2026-09-19).
 */
export const 기본서비스색 = '#3A5FCD';

/**
 * 색이 기준에 못 미치면 사유 (DESIGN.md).
 *
 * **막지 않고 알린다.** 색은 사람이 고르는 것이고, 기준을 아는 사람이 일부러 쓸 수도 있다.
 * 다만 모르고 쓰는 일은 없어야 한다 — DB 의 DEMO 서비스가 `#888888`(3.5)로 들어가 있던 것이
 * 이 장치가 없어서였다 (2026-09-19, ① 에서 넘긴 항목).
 * 그 `#888888` 은 2026-09-21 기준 변경으로 이제 통과한다 — 기준이 느슨해진 것이지
 * 장치가 약해진 것이 아니다. 너무 밝은 색은 여전히 걸린다.
 */
export function 색사유(hex: string): string | null {
  const 비 = 명암비(hex);
  if (비 >= 최소명암비) return null;
  return `서비스 표시가 잘 안 보입니다 (명암비 ${비.toFixed(1)} · 기준 ${String(최소명암비)}). 더 진한 색을 고릅니다`;
}

/**
 * 아직 보낼 수 없는 이유 (SPEC §8.2 · DESIGN.md).
 *
 * **버튼을 죽이지 않는다.** 살려 두고 왜 안 되는지 말한다 — 회색 버튼은 이유를 말할 자리가 없어서
 * 사람이 눌러 보고도 모른다.
 *
 * **서버가 거부할 것을 여기서 먼저 거른다.** 빈 대상 서버 줄을 그대로 보내면 서버 zod 가
 * 400 `INVALID_REQUEST` 를 내는데, 그 답에는 어느 칸인지가 사람 말로 안 담긴다.
 * 색도 마찬가지다 — 모양이 아닌 값이 저장되면 띠의 `background` 가 무효가 되어 색이 아예 없어진다.
 */
export function 서비스못보내는이유(입력: {
  새것: boolean;
  prefix: string;
  name: string;
  testsDir: string;
  color: string;
  envs: EnvRow[];
}): string | null {
  // 고칠 때 접두사 칸은 잠겨 있다. 그것을 두고 「채우세요」라고 하면 할 수 없는 일을 시키는 것이다
  if (입력.새것) {
    if (입력.prefix === '') return '접두사를 채웁니다';
    const 모양 = 접두사사유(입력.prefix);
    if (모양 !== null) return 모양;
  }
  if (입력.name === '') return '이름을 채웁니다';
  if (입력.testsDir === '') return '테스트 폴더를 채웁니다';
  if (색을푼다(입력.color) === null) return '색 모양이 다릅니다. #3A5FCD 처럼 적습니다';
  // 없는 것은 괜찮다. 나중에 더하면 된다 — 적다 만 줄만 막는다
  if (입력.envs.some((it) => it.env === '' || it.baseUrl === '')) {
    return '대상 서버 줄에 빈 칸이 있습니다. 채우거나 그 줄을 뺍니다';
  }
  return null;
}

export function 계정못보내는이유(입력: { username: string; displayName: string }): string | null {
  if (입력.username === '') return '아이디를 채웁니다';
  if (입력.displayName === '') return '이름을 채웁니다';
  return null;
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

/**
 * 서버가 낸 코드를 사람이 읽을 문장으로 (CLAUDE.md §4).
 *
 * **표는 `errorText.ts` 하나다.** 2026-09-19 까지 여기에 따로 있었는데, 그러면 같은 화면에서
 * 불러오기 실패(`useAsync` → `message()`)와 저장 실패(여기)가 **다른 표를 보고 다른 말투로** 뜬다.
 * 코드를 하나 옮길 때마다 어느 표에 넣을지도 매번 갈린다.
 *
 * **모르는 코드는 삼키지 않는다.** 코드를 그대로 붙여 준다 —
 * 「알 수 없는 오류」만 띄우면 무엇이 틀렸는지 알 길이 사라진다 (CLAUDE.md §3 에러 규칙).
 *
 * `detail` 은 서버가 **어느 칸이 틀렸는지** 짚어 준 것이다. 버리면 사람이 폼 전체를 뒤진다.
 */
export function 설정오류문장(code: string, detail?: string): string {
  return 요청오류문장(code, detail);
}
