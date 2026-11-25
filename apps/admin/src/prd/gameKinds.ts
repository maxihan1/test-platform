// 게임 지도의 종류와 「배운 것」 칸 — 기본 종류 스물다섯 · 게임이 만든 종류(`kind:` 줄) · learned 본문 검사 (도메인/게임 §3.10 「게임에 대해 배운 것」 · §7 game-elements)
// 작성 에이전트의 지도 찾기(scripts/authoring-game-find.ts)도 읽는다 — DB 를 부르지 않는다

/** 종류의 정본 — DB 에 CHECK 가 없다(2026-11-25). KIND 는 게임이 만든 종류의 정의 줄이다 */
export const 요소종류 = {
  DATA: '게임 데이터', WORLD: '월드', STATE: '상태', MOVE: '상태 바뀜', FLOW: '재화 흐름',
  SYSTEM: '시스템', GOAL: '목표', RULE: '규칙', CALC: '계산', GROWTH: '성장', STAGE: '진행',
  INPUT: '조작', BEHAVIOR: '적 행동', MATCH: '상성', TIME: '시간', PLAY: '이기는 법', FAIL: '진 까닭',
  SIGNAL: '신호', PROBE: '보는 법', MULTI: '여럿이', SAVE: '저장과 설정',
  BOUND: '경계', TRIAL: '시험', ASK: '궁금한 것', ODD: '이상한 것',
  KIND: '게임이 만든 종류',
} as const;
export type 기본종류 = keyof typeof 요소종류;

/** 기획서에서 온 다섯 — 열쇠 앞머리가 자유롭고, 케이스가 다뤘는지 세는 것도 이 다섯뿐이다 */
export const 기획서종류: ReadonlySet<string> = new Set(['DATA', 'WORLD', 'STATE', 'MOVE', 'FLOW']);

// in 은 toString 같은 물려받은 이름도 통과시킨다
export const 기본종류인가 = (v: string): v is 기본종류 => Object.hasOwn(요소종류, v);

const 만든종류꼴 = /^[A-Z][A-Z_]{0,29}$/;
// 뜻이 정해진 앞머리 — 경로 검색(state: · zone: · game:)과 서버 값 대조(item: 등)가 이 글자로 가른다
const 뜻있는앞머리 = new Set(['item', 'monster', 'skill', 'shop', 'drop', 'rate', 'zone', 'spawn', 'npc', 'state', 'move', 'flow', 'game', 'kind']);

/** `kind:WEATHER` 에서 `WEATHER` — 기본 종류 이름이나 뜻이 정해진 앞머리와 겹치면 null */
export function 만든종류이름(열쇠: string): string | null {
  const 이름 = 열쇠.startsWith('kind:') ? 열쇠.slice('kind:'.length) : '';
  return 만든종류꼴.test(이름) && !기본종류인가(이름) && !뜻있는앞머리.has(이름.toLowerCase()) ? 이름 : null;
}

export const 믿음 = { GUESS: '추측', SEEN: '덜 봄', CONFIRMED: '확인', GAME_TEXT: '게임 글', OVERTURNED: '뒤집힘' } as const;
export const 꼴 = { FIXED: '고정', RANGE: '폭', RATE: '확률', LIST: '목록', DEPENDS: '앞에 매임', UNKNOWN: '모름' } as const;
export const 표시 = { CHEAT: '치트로 봄', SEED: '씨앗 고정', HUMAN: '사람이 바로잡음' } as const;

export interface 배운것 {
  text: string;
  /** KIND 줄(종류 정의)에는 없어도 된다 */
  belief?: keyof typeof 믿음;
  seen?: number;
  build?: string;
  shape?: keyof typeof 꼴;
  marks?: (keyof typeof 표시)[];
  /** 잰 것 — 앞뒤 값 · 최소~최대 · k/n · 나온 것마다 횟수 */
  data?: unknown;
  related?: string[];
}

const 상한 = { 글: 1_000, 빌드: 100, 전체: 10_000, 횟수: 1_000_000, 관련: 50, 열쇠: 200 } as const;
const 칸들 = new Set(['text', 'belief', 'seen', 'build', 'shape', 'marks', 'data', 'related']);
// 열쇠는 「item:sword_short」 「move:성향 선량→보라」 꼴 — 앞머리 뒤에 무엇이든 온다
export const 열쇠꼴 = /^[a-z_]+:\S/;

const 글인가 = (v: unknown, 최대: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= 최대;
const 하나인가 = (v: unknown, 목록: object): boolean => typeof v === 'string' && Object.hasOwn(목록, v);

/** learned 본문을 본다. 맞으면 null, 틀리면 그 칸 이름(전체가 틀렸으면 빈 글) */
export function 배운것틀림(v: unknown, 종류: string): string | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return '';
  const l = v as Record<string, unknown>;
  // 모르는 칸을 버리면 AI 가 잘못 적은 이름(confidence 같은)이 조용히 사라진다
  const 모름 = Object.keys(l).find((k) => !칸들.has(k));
  if (모름 !== undefined) return 모름.slice(0, 50);
  if (!글인가(l.text, 상한.글)) return 'text';
  if (l.belief === undefined ? 종류 !== 'KIND' : !하나인가(l.belief, 믿음)) return 'belief';
  if (l.seen !== undefined && !(Number.isInteger(l.seen) && (l.seen as number) >= 0 && (l.seen as number) <= 상한.횟수)) return 'seen';
  if (l.build !== undefined && !글인가(l.build, 상한.빌드)) return 'build';
  if (l.shape !== undefined && !하나인가(l.shape, 꼴)) return 'shape';
  if (l.marks !== undefined && !(Array.isArray(l.marks) && new Set(l.marks).size === l.marks.length && l.marks.every((m) => 하나인가(m, 표시)))) return 'marks';
  if (l.related !== undefined && !(Array.isArray(l.related) && l.related.length <= 상한.관련 && l.related.every((k) => 글인가(k, 상한.열쇠) && 열쇠꼴.test(k)))) return 'related';
  const 글 = JSON.stringify(l);
  // jsonb 는 NUL 을 못 담는다 — 그대로 넣으면 500 이 난다
  return 글.length > 상한.전체 || 글.includes('\\u0000') ? '' : null;
}
