// 설정 화면이 하는 판단 (SPEC §8.8). 화면은 그리기만 하고 고를 것은 여기서 정한다

import type { EnvRow, UserRow } from './api.js';
import { 요청오류문장 } from './errorText.js';
import { t, type 언어 } from './i18n.js';

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
export function 접두사사유(prefix: string, 언어: 언어): string | null {
  if (prefix === '') return null;
  if (접두사모양.test(prefix)) return null;
  return t('대문자로 시작하는 영문·숫자 12자 이내로 적습니다. 예: PAY · MEM2', 언어);
}

/** `#` 이 있든 없든, 대소문자 상관없이 여섯 자리 16진수일 때만 푼다 */
/**
 * 새 서비스를 만들 때 화면이 보내는 색.
 *
 * **화면은 이 값을 묻지도 보여주지도 않는다** — 서비스 색은 2026-09-22 에 화면에서 걷었다 (SPEC §8).
 * 그래도 보내는 이유는 `service.color` 가 INSERT 필수이기 때문이다 (`settings/store.ts`).
 * 칸을 지우는 것은 마이그레이션이라 되돌릴 수 없어 남겨 뒀다.
 *
 * **이 값을 보고 「색이 아직 쓰인다」고 읽지 마라.** 아무 데도 안 나온다.
 */
export const 안쓰는서비스색 = '#6B7280';

/**
 * 아직 보낼 수 없는 이유 (SPEC §8.2 · DESIGN.md).
 *
 * **버튼을 죽이지 않는다.** 살려 두고 왜 안 되는지 말한다 — 회색 버튼은 이유를 말할 자리가 없어서
 * 사람이 눌러 보고도 모른다.
 *
 * **서버가 거부할 것을 여기서 먼저 거른다.** 빈 대상 서버 줄을 그대로 보내면 서버 zod 가
 * 400 `INVALID_REQUEST` 를 내는데, 그 답에는 어느 칸인지가 사람 말로 안 담긴다.
 */
export function 서비스못보내는이유(
  입력: {
    새것: boolean;
    prefix: string;
    name: string;
    testsDir: string;
    envs: EnvRow[];
  },
  언어: 언어,
): string | null {
  // 고칠 때 접두사 칸은 잠겨 있다. 그것을 두고 「채우세요」라고 하면 할 수 없는 일을 시키는 것이다
  if (입력.새것) {
    if (입력.prefix === '') return t('접두사를 채웁니다', 언어);
    const 모양 = 접두사사유(입력.prefix, 언어);
    if (모양 !== null) return 모양;
  }
  if (입력.name === '') return t('이름을 채웁니다', 언어);
  if (입력.testsDir === '') return t('테스트 폴더를 채웁니다', 언어);
  // 없는 것은 괜찮다. 나중에 더하면 된다 — 적다 만 줄만 막는다
  if (입력.envs.some((it) => it.env === '' || it.baseUrl === '')) {
    return t('대상 서버 줄에 빈 칸이 있습니다. 채우거나 그 줄을 뺍니다', 언어);
  }
  return null;
}

export function 계정못보내는이유(
  입력: { username: string; displayName: string },
  언어: 언어,
): string | null {
  if (입력.username === '') return t('아이디를 채웁니다', 언어);
  if (입력.displayName === '') return t('이름을 채웁니다', 언어);
  return null;
}

/**
 * Slack 웹훅 칸에 무엇을 적나 (SPEC §8.8).
 *
 * **주소를 되돌려 보여주지 않는다.** 비밀값이라 응답에도 안 담겨 오고(§7),
 * 화면은 설정됐는지만 안다. 그래서 고치는 길이 「바꾸기」가 아니라 「다시 넣기」다.
 */
export function 웹훅칸(hasSlackWebhook: boolean, 언어: 언어): { 글: string; 버튼: string } {
  return hasSlackWebhook
    ? { 글: t('설정됨', 언어), 버튼: t('다시 넣기', 언어) }
    : { 글: t('없음', 언어), 버튼: t('넣기', 언어) };
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
export function 설정오류문장(code: string, 언어: 언어, detail?: string): string {
  return 요청오류문장(code, 언어, detail);
}
