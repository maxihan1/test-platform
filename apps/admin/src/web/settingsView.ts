// 설정 화면이 하는 판단 (SPEC §8.8). 화면은 그리기만 하고 고를 것은 여기서 정한다

import { 아이디모양 } from '../auth/rules.js';
import { type 역할까닭, 역할까닭찾기, 역할최대개수, 역할최대글자 } from '../settings/roles.js';
import { 제외경로정리, 제외경로최대개수, 제외경로최대글자 } from '../settings/rules.js';

import type { EnvRow, SettingsServiceRow, UserRow } from './api.js';
import { 요청오류문장 } from './errorText.js';
import { t, type 언어 } from './i18n.js';
import type { 권한칸, 기능, 칸 } from './role.js';

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
    /** 만드는 중이다(마법사) — 접두사를 본다. 고칠 때 접두사 칸은 잠겨 있다 */
    새것: boolean;
    prefix: string;
    name: string;
    testsDir: string;
    /** 역할들은 편집 중인 역할 계정 — 서버가 400 BAD_ROLE 로 막을 이름을 여기서 먼저 짚는다 */
    envs: (EnvRow & { 역할들?: readonly { role: string }[] })[];
    /** 「탐색 제외 경로」 칸에 적은 그대로. 한 줄에 하나 */
    제외: string;
    /** 정기 실행 — 꺼져 있으면 null. 새 서비스에는 구획이 없어 안 넘긴다 */
    정기실행?: { at: string; env: string } | null;
  },
  언어: 언어,
): string | null {
  // 고칠 때 접두사 칸은 잠겨 있다. 그것을 두고 「채우세요」라고 하면 할 수 없는 일을 시키는 것이다
  if (입력.새것) {
    if (입력.prefix === '') return t('접두사를 입력해 주세요', 언어);
    const 모양 = 접두사사유(입력.prefix, 언어);
    if (모양 !== null) return 모양;
  }
  if (입력.name === '') return t('이름을 입력해 주세요', 언어);
  if (입력.testsDir === '') return t('테스트 폴더를 입력해 주세요', 언어);
  // 없는 것은 괜찮다. 나중에 더하면 된다 — 적다 만 줄만 막는다
  if (입력.envs.some((it) => it.env === '' || it.baseUrl === '')) {
    return t('대상 서버에 비어 있는 항목이 있습니다. 입력하거나 그 서버를 삭제해 주세요', 언어);
  }
  // 키가 줄을 가르는 이름이다 — 서버는 400 INVALID_REQUEST 로만 답해 어느 칸인지 모른다
  if (new Set(입력.envs.map((it) => it.env)).size !== 입력.envs.length) return t('같은 키의 대상 서버가 둘 있습니다. 키를 다르게 적어 주세요', 언어);
  // 서버와 같은 규칙 파일이다 (settings/roles.ts)
  for (const it of 입력.envs) {
    const 까닭 = 역할까닭찾기((it.역할들 ?? []).map((r) => r.role));
    if (까닭 !== null) return t(역할사유[까닭], 언어, { 글자: 역할최대글자, 개수: 역할최대개수 });
  }
  // 서버와 같은 규칙 파일이다. 여러 줄 중 어느 줄인지 짚어 줘야 칸을 다시 뒤지지 않는다
  const { 틀린줄, 까닭 } = 제외경로풀기(입력.제외);
  if (까닭 !== undefined) {
    return t(제외사유[까닭], 언어, { 줄: 틀린줄, 글자: 제외경로최대글자, 개수: 제외경로최대개수 });
  }
  const 정기 = 입력.정기실행;
  if (정기 !== undefined && 정기 !== null) {
    if (정기.at === '') return t('정기 실행 시각을 입력해 주세요', 언어);
    // 대상 서버 줄의 이름을 고쳤거나 줄을 뺐으면 고른 것이 사라진다 — 서버가 400 을 내기 전에 사람 말로 짚는다
    if (!입력.envs.some((it) => it.env === 정기.env)) return t('정기 실행의 대상 서버를 대상 서버 목록에서 고릅니다', 언어);
  }
  return null;
}

/** 정기 실행을 켤 때 처음 고르는 대상 서버 — demo 가 있으면 그것, 없으면 첫 줄 (도메인/인증 §8.8) */
export function 처음대상서버(envs: readonly string[]): string {
  return envs.includes('demo') ? 'demo' : (envs[0] ?? '');
}

/** 키는 settings/roles.ts 의 `역할까닭` 이다. 까닭이 늘면 여기서 타입이 깨져 빠뜨리지 않는다 */
const 역할사유: Record<역할까닭, string> = {
  빈칸: '역할 이름을 입력해 주세요',
  일반회원: '「일반 회원」은 역할 이름으로 쓸 수 없습니다',
  길이: '역할 이름은 {글자}자까지 적을 수 있습니다',
  겹침: '한 대상 서버 줄 안에서 역할 이름이 겹칩니다',
  개수: '역할 계정은 한 줄에 {개수}개까지 넣을 수 있습니다',
};

/** 키는 settings/rules.ts 의 `까닭` 이다. 까닭이 늘면 여기서 타입이 깨져 빠뜨리지 않는다 */
const 제외사유 = {
  모양: '「{줄}」 — / 로 시작하고 글자·숫자·. _ ~ % - 만 쓸 수 있습니다',
  길이: '경로는 {글자}자까지 적을 수 있습니다',
  개수: '경로는 {개수}개까지 적을 수 있습니다',
};

// 결과를 `'틀린줄' in` 으로 가르면 messages.test.ts 가 그 낱말을 화면 글자로 잡는다. 빈 칸을 깔고 펼쳐서 판다
function 제외경로풀기(글: string) {
  return { 값: undefined, 틀린줄: '', 까닭: undefined, ...제외경로정리(글.split('\n')) };
}

/** 보낼 목록. 틀린 줄은 위 `서비스못보내는이유` 가 먼저 막는다 — 그래도 오면 빈 목록(전부 지움)을 보내지 않고 멈춘다 */
export function 제외경로값(글: string): string[] {
  const { 값, 틀린줄 } = 제외경로풀기(글);
  if (값 === undefined) throw new Error(`crawlExclude: invalid line ${틀린줄}`);
  return 값;
}

export function 계정못보내는이유(
  입력: { username: string; displayName: string; 새것: boolean },
  언어: 언어,
): string | null {
  if (입력.username === '') return t('아이디를 입력해 주세요', 언어);
  // 서버와 같은 규칙·같은 문장이다. 보낸 뒤 400 을 받고서야 알면 칸을 다시 찾아야 한다.
  // 고칠 때는 아이디 칸이 잠겨 있다 — 규칙 전에 만든 아이디로 저장을 막으면 할 수 없는 일을 시킨다
  if (입력.새것 && !아이디모양.test(입력.username)) return 요청오류문장('USERNAME_SHAPE', 언어);
  if (입력.displayName === '') return t('이름을 입력해 주세요', 언어);
  return null;
}

/**
 * Slack 웹훅 칸에 무엇을 적나 (SPEC §8.8).
 *
 * **주소를 되돌려 보여주지 않는다.** 비밀값이라 응답에도 안 담겨 오고(§7),
 * 화면은 설정됐는지만 안다. 그래서 고치는 길이 「변경」이다 — 값이 없을 때는 `+` 기호 하나만 둔다.
 */
export function 웹훅칸(hasSlackWebhook: boolean, 언어: 언어): { 글: string; 버튼: string } {
  return hasSlackWebhook
    ? { 글: t('설정됨', 언어), 버튼: t('변경', 언어) }
    : { 글: t('없음', 언어), 버튼: '+' };
}

/** 피그마 토큰 발급 안내의 링크. 토큰은 Figma 계정 설정의 Security 탭에서 만든다 (도메인/인증 §8.8) */
export const 피그마설정주소 = 'https://www.figma.com/settings';

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
  // 서버 LAST_ADMIN 과 같은 기준 — 승인 전 계정은 못 들어오니 수에 안 넣는다
  return 계정들.filter((it) => it.role === 'admin' && it.isActive && it.isApproved !== false).length <= 1;
}

/** 목록 줄과 고르개가 칸을 늘어놓는 순서. 사람마다 순서가 바뀌면 줄끼리 견줄 수 없다 */
export const 기능순서: 기능[] = ['cases', 'runs', 'authoring'];

export type 계정요약값 =
  | { 운영: true }
  | { 운영: false; 프로젝트: { 이름: string; 칸들: [기능, 칸][] }[]; 대시보드: 'none' | 'read' };

/** 권한 폼과 계정 목록이 쓰는 프로젝트 한 줄. `앱수` 는 그 프로젝트 안의 애플리케이션 수다 */
export interface 프로젝트줄 {
  id: number;
  name: string;
  앱수: number;
}

/** 설정이 읽어 온 프로젝트와 애플리케이션으로 `프로젝트줄` 목록을 만든다 */
export function 프로젝트줄들(projects: { id: number; name: string }[], services: SettingsServiceRow[]): 프로젝트줄[] {
  return projects.map((it) => ({ ...it, 앱수: services.filter((s) => s.projectId === it.id).length }));
}

/** 계정 목록 한 줄에 적을 권한 (도메인/인증 §8.8). admin 은 전부라 칸을 늘어놓지 않는다 */
export function 계정요약(row: UserRow, projects: 프로젝트줄[]): 계정요약값 {
  if (row.role === 'admin') return { 운영: true };
  return {
    운영: false,
    프로젝트: (row.projects ?? []).map((it) => ({
      // 비어 지워진 프로젝트의 줄은 서버가 같이 지운다. 그래도 이름을 못 찾으면 번호로라도 보여준다
      이름: projects.find((p) => p.id === it.projectId)?.name ?? `#${it.projectId}`,
      칸들: 기능순서.map((f): [기능, 칸] => [f, it.permissions[f]]),
    })),
    대시보드: row.dashboard,
  };
}

/**
 * 한 프로젝트 묶음에 붙일 알림 (도메인/인증 §3.5 · §8.8).
 * `allOff` 은 서버가 400 PERMISSIONS_SHAPE 로 거절하는 모양이라 저장을 막는다.
 * `noCases` 은 막지 않는다 — 실행만 맡기는 사람도 있을 수 있어 알리기만 한다
 */
export function 권한경고(p: 권한칸): 'noCases' | 'allOff' | null {
  if (p.cases === 'none' && p.runs === 'none' && p.authoring === 'none') return 'allOff';
  if (p.runs === 'write' && p.cases === 'none') return 'noCases';
  return null;
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
