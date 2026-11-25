// 게임 배우기의 판단 — 지도에서 배울 것 고르기 · 게임 글 빠짐 · PR 머리의 사람이 볼 줄 (도메인/게임 §3.10 「게임 배우기」). 파일 · 통신은 authoring-learn 이 한다
import { 기획서종류, 요소종류 } from '../apps/admin/src/prd/gameKinds.js';
import { type 지도읽기, 근거들, 바뀜 } from './authoring-game-find.js';
import { 빌드다른가, 안써봄들, 열린물음, 쪽지열쇠 } from './authoring-game-tree.js';
import { 계정섞였나 } from './authoring-reverse.js';

export type 지도 = ReturnType<typeof 지도읽기>;

/** 비어 있으면 배울 것인 기본 종류 — 기획서에서 온 다섯, 남은 것이 곧 할 일인 궁금한 것, 없어야 좋은 이상한 것, 종류 정의는 뺀다 */
export const 배울종류: readonly string[] = Object.keys(요소종류).filter((k) => !기획서종류.has(k) && k !== 'ASK' && k !== 'ODD' && k !== 'KIND');

export { 쪽지열쇠 };
/** 서버가 `learned.text` 를 받는 길이다 */
const 쪽지상한 = 1_000;

export interface 배울것 {
  빈종류: string[];
  궁금: string[];
  /** 게임 글로 읽기만 하고 해 보지 않은 줄 — 네 번째 실측의 보류 25건이 다 여기서 왔다(2026-11-25 GAME-F6-05) */
  안잰글: string[];
  /** 판에서 쓸 법을 적었는데 아직 판에서 안 써 본 줄 */
  안써봄: string[];
  빌드다름: string[];
  /** 지도 줄 어디에도 안 든 게임 안 글 */
  게임글: string[];
  /** 이어 작성 · 반영 — 아직 안 배운 요구 번호 */
  번호: string[];
}

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 한칸 = (글: string): string => 글.replace(/\s+/g, ' ').trim();

// 열쇠 이름까지 — 비밀번호를 칸 이름으로 적어도 잡는다(authoring-game 요소올리기와 같다)
export const 글자들 = (v: unknown): string[] => (typeof v === 'string' ? [v] : typeof v === 'object' && v !== null ? Object.entries(v).flatMap(([k, x]) => [k, ...글자들(x)]) : []);

const 짧은줄 = 12;

/** 게임 안 글(한 줄에 한 문장 · `#` 줄은 어디서 읽었나) 가운데 지도의 배운 줄 어디에도 안 든 문장 */
export function 빠진게임글(글: string | null, 지금: 지도): string[] {
  const 문장들 = [...new Set((글 ?? '').split('\n').map(한칸).filter((s) => s !== '' && !s.startsWith('#')))];
  if (문장들.length === 0) return [];
  const 담긴 = 지금.줄들.flatMap((x) => (x.learned === null || x.key === 쪽지열쇠 ? [] : 글자들(x.learned))).flatMap((t) => [t, ...t.split(/\n| \/ | · /)]).map(한칸);
  // 「방패」 같은 짧은 줄은 남의 문장에 우연히 들어 있다 — 그 줄을 그대로 적었을 때만 든 것이다
  return 문장들.filter((s) => !담긴.some((t) => (s.length < 짧은줄 ? t === s : t.includes(s))));
}

/** 번호를 주면(이어 작성 · 반영) 그 요구에 닿는 줄만 본다 — 전체를 다시 배우지 않는다 */
export function 배울것고르기(지금: 지도, 것: { 빌드?: string; 오늘: string; 게임글: string | null; 번호들?: readonly string[] }): 배울것 {
  const 열린 = 열린물음(지금, 것.오늘, 것.빌드);
  if (것.번호들 !== undefined) {
    // 게임 글로 읽기만 한 줄은 배운 것이 아니다 — 막혔거나 물을 것이 아니라고 닫은 것만 배운 것으로 친다
    const 번호 = 것.번호들.filter((n) => {
      const 들 = 지금.줄들.filter((x) => 근거들(x).includes(n));
      const 배움 = 들.filter((x) => x.learned !== null);
      return 배움.length === 0 || 들.some((x) => 바뀜(x)?.split(', ').includes(n) === true) || 배움.some((x) => (x.learned!.belief === 'GAME_TEXT' ? 열린.includes(x) : x.learned!.belief !== 'CONFIRMED') || 빌드다른가(x, 것.빌드));
    });
    return { 빈종류: [], 궁금: [], 안잰글: [], 안써봄: [], 빌드다름: [], 게임글: [], 번호 };
  }
  return {
    // 쪽지 한 줄로 「이기는 법」 종류가 찬 것으로 보이면 안 된다
    빈종류: 배울종류.filter((k) => !지금.줄들.some((x) => x.kind === k && x.learned !== null && x.key !== 쪽지열쇠)),
    궁금: 열린.filter((x) => x.kind === 'ASK').map((x) => x.key),
    안잰글: 열린.filter((x) => x.kind !== 'ASK').map((x) => x.key),
    안써봄: 안써봄들(지금, 것.오늘, 것.빌드).map((x) => x.key),
    빌드다름: 지금.줄들.filter((x) => x.kind !== 'ASK' && x.kind !== 'KIND' && x.key !== 쪽지열쇠 && x.learned !== null && x.learned.belief !== 'OVERTURNED' && 빌드다른가(x, 것.빌드)).map((x) => x.key),
    게임글: 빠진게임글(것.게임글, 지금),
    번호: [],
  };
}

export const 자름 = (글: string, 수: number): string => (글.length > 수 ? `${글.slice(0, 수)}…` : 글);

/** 뒤집었거나 비운 쪽지는 없는 것이다 */
export function 쪽지글(지금: 지도): string | null {
  const 줄 = 지금.줄들.find((x) => x.key === 쪽지열쇠);
  if (줄 === undefined || 줄.learned === null || 줄.learned.belief === 'OVERTURNED' || !글인가(줄.learned.text)) return null;
  return 자름(줄.learned.text.trim(), 쪽지상한);
}

export const 배울것없나 = (b: 배울것): boolean => Object.values(b).every((x: string[]) => x.length === 0);

export const 목록글 = (들: readonly string[], 수: number): string => `${들.slice(0, 수).join(' · ')}${들.length > 수 ? ` 외 ${들.length - 수}개` : ''}`;

/**
 * 사람이 움직여야 하는 것만 — 이번 작성이 적은 이상한 것 · 막혀서 사람에게 물을 것. 지도 요약은 싣지 않는다(지도는 에이전트만 본다).
 * 공개 저장소의 PR 이라 계정 비밀번호가 섞였으면 글을 적지 않는다
 */
export function 사람줄(지금: 지도, 적은열쇠: ReadonlySet<string>, 비밀: readonly string[]): string[] {
  const 들 = 지금.줄들.filter((x) => 적은열쇠.has(x.key) && x.learned !== null && x.learned.belief !== 'OVERTURNED');
  const 줄 = (머리: string, 줄들: string[]): string[] =>
    줄들.length === 0 ? [] : [계정섞였나(줄들, 비밀) ? `${머리}: ${줄들.length}개 — 테스트 계정 비밀번호가 들어 있어 안 적음` : `${머리}: ${목록글(줄들.map((s) => 자름(s, 120)), 10)}`];
  return [
    ...줄('게임 버그 후보', 들.filter((x) => x.kind === 'ODD' && x.key !== 'odd:없음').map((x) => `${x.name} — ${한칸(x.learned!.text)}`)),
    ...줄('게임에서 사람에게 물을 것', 들.filter((x) => x.kind === 'ASK' && 글인가(객체(x.learned!.data).막힘)).map((x) => `${x.name}(${한칸(String(객체(x.learned!.data).막힘))})`)),
  ];
}
