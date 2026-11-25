// 게임 배우기의 판단 — 지도에서 배울 것 고르기 · 게임 글 빠짐 · PR 머리의 사람이 볼 줄 (도메인/게임 §3.10 「게임 배우기」). 파일 · 통신은 authoring-learn 이 한다
import { 기획서종류, 요소종류 } from '../apps/admin/src/prd/gameKinds.js';
import { type 지도읽기, type 지도줄, 근거들, 바뀜 } from './authoring-game-find.js';
import { 계정섞였나 } from './authoring-reverse.js';

export type 지도 = ReturnType<typeof 지도읽기>;

/** 비어 있으면 배울 것인 기본 종류 — 기획서에서 온 다섯, 남은 것이 곧 할 일인 궁금한 것, 없어야 좋은 이상한 것, 종류 정의는 뺀다 */
export const 배울종류: readonly string[] = Object.keys(요소종류).filter((k) => !기획서종류.has(k) && k !== 'ASK' && k !== 'ODD' && k !== 'KIND');

/**
 * 종류마다 재서 채울 칸 — 게임이 달라도 같다(2026-11-25 사용자 「무엇을 배워야 하는지 에이전트가 알아야 한다」).
 * 종류에 줄이 하나라도 있으면 배운 것으로 치던 앞 판은 글만 옮겨 적고 공격이 어디까지 닿는지 · 적이 어디서 나오는지 모른 채 판을 되풀이했다
 */
export const 칸틀: Readonly<Record<string, readonly string[]>> = {
  INPUT: ['어디서', '닿는곳', '바뀌는것', '간격', '안될때'],
  BEHAVIOR: ['오브젝트', '길', '빠르기', '하는일', '없어질때'],
  WORLD: ['나오는곳', '가는곳', '막힌곳', '쓸자리', '지킬것'],
};

export interface 배울것 {
  /** 아직 안 잰 칸 — 이것부터 */
  칸: string[];
  빈종류: string[];
  궁금: string[];
  빌드다름: string[];
  /** 지도 줄 어디에도 안 든 게임 안 글 */
  게임글: string[];
  /** 이어 작성 · 반영 — 아직 안 배운 요구 번호 */
  번호: string[];
}

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 한칸 = (글: string): string => 글.replace(/\s+/g, ' ').trim();
const 빌드다른가 = (x: 지도줄, 빌드?: string): boolean => 빌드 !== undefined && x.learned?.build !== undefined && x.learned.build !== 빌드;

/** 막힌 궁금한 것은 빌드가 바뀌어야, 다음 날 볼 것은 그날이 되어야 다시 배울 것이다 — 안 가르면 배울 것이 영영 안 끝난다 */
function 열린궁금(x: 지도줄, 오늘: string, 빌드?: string): boolean {
  if (x.kind !== 'ASK' || x.learned === null || x.learned.belief === 'OVERTURNED' || x.key === 'ask:없음') return false;
  const d = 객체(x.learned.data);
  if (글인가(d.막힘) && !빌드다른가(x, 빌드)) return false;
  return !(글인가(d.볼날) && d.볼날 > 오늘);
}

// 열쇠 이름까지 — 비밀번호를 칸 이름으로 적어도 잡는다(authoring-game 요소올리기와 같다)
export const 글자들 = (v: unknown): string[] => (typeof v === 'string' ? [v] : typeof v === 'object' && v !== null ? Object.entries(v).flatMap(([k, x]) => [k, ...글자들(x)]) : []);

const 짧은줄 = 12;

/** 게임 안 글(한 줄에 한 문장 · `#` 줄은 어디서 읽었나) 가운데 지도의 배운 줄 어디에도 안 든 문장 */
export function 빠진게임글(글: string | null, 지금: 지도): string[] {
  const 문장들 = [...new Set((글 ?? '').split('\n').map(한칸).filter((s) => s !== '' && !s.startsWith('#')))];
  if (문장들.length === 0) return [];
  const 담긴 = 지금.줄들.flatMap((x) => (x.learned === null ? [] : 글자들(x.learned))).flatMap((t) => [t, ...t.split(/\n| \/ | · /)]).map(한칸);
  // 「방패」 같은 짧은 줄은 남의 문장에 우연히 들어 있다 — 그 줄을 그대로 적었을 때만 든 것이다
  return 문장들.filter((s) => !담긴.some((t) => (s.length < 짧은줄 ? t === s : t.includes(s))));
}

const 찼나 = (v: unknown): boolean => (typeof v === 'string' ? v.trim() !== '' && !v.trim().startsWith('모름') : v !== undefined && v !== null && v !== '' && (typeof v !== 'object' || Object.keys(v).length > 0));

/** 안 찬 칸 — 조작 · 움직이는 것은 줄마다(판에서 안 쓰는 것은 `칸: "아님 — 까닭"`), 맵은 칸을 단 줄만 본다 */
export function 빈칸들(지금: 지도): string[] {
  return Object.entries(칸틀).flatMap(([종류, 틀]) => {
    const 줄들 = 지금.줄들.filter((x) => x.kind === 종류 && x.learned !== null && x.learned.belief !== 'OVERTURNED');
    const 배운 = 줄들.filter((x) => !x.key.endsWith(':없음'));
    const 칸있는 = 배운.filter((x) => Object.keys(객체(객체(x.learned!.data).칸)).length > 0);
    // 줄이 하나도 없는 조작 · 적 행동은 빈 종류가 이미 말한다
    const 없음 = 칸있는.length === 0 && 배운.length === 줄들.length && (배운.length > 0 || 종류 === 'WORLD') ? [`${종류} — 판에서 쓰는 것을 줄마다 칸으로 적은 것이 하나도 없음`] : [];
    return [...없음, ...배운.flatMap((x) => {
      const 칸 = 객체(x.learned!.data).칸;
      if (글인가(칸)) return [];
      if (!칸있는.includes(x)) return 종류 === 'WORLD' ? [] : [`${x.key} — 칸 없음`];
      const 빈 = 틀.filter((k) => !찼나(객체(칸)[k]));
      return 빈.length === 0 ? [] : [`${x.key} — ${빈.join(' · ')}`];
    })];
  });
}

/** 번호를 주면(이어 작성 · 반영) 그 요구에 닿는 줄만 본다 — 전체를 다시 배우지 않는다 */
export function 배울것고르기(지금: 지도, 것: { 빌드?: string; 오늘: string; 게임글: string | null; 번호들?: readonly string[] }): 배울것 {
  if (것.번호들 !== undefined) {
    const 번호 = 것.번호들.filter((n) => {
      const 들 = 지금.줄들.filter((x) => 근거들(x).includes(n));
      const 배움 = 들.filter((x) => x.learned !== null);
      return 배움.length === 0 || 들.some((x) => 바뀜(x)?.split(', ').includes(n) === true) || 배움.some((x) => (x.learned!.belief !== 'CONFIRMED' && x.learned!.belief !== 'GAME_TEXT') || 빌드다른가(x, 것.빌드));
    });
    return { 칸: [], 빈종류: [], 궁금: [], 빌드다름: [], 게임글: [], 번호 };
  }
  return {
    칸: 빈칸들(지금),
    빈종류: 배울종류.filter((k) => !지금.줄들.some((x) => x.kind === k && x.learned !== null)),
    궁금: 지금.줄들.filter((x) => 열린궁금(x, 것.오늘, 것.빌드)).map((x) => x.key),
    빌드다름: 지금.줄들.filter((x) => x.kind !== 'ASK' && x.kind !== 'KIND' && x.learned !== null && x.learned.belief !== 'OVERTURNED' && 빌드다른가(x, 것.빌드)).map((x) => x.key),
    게임글: 빠진게임글(것.게임글, 지금),
    번호: [],
  };
}

export const 배울것없나 = (b: 배울것): boolean => Object.values(b).every((x: string[]) => x.length === 0);

export const 자름 = (글: string, 수: number): string => (글.length > 수 ? `${글.slice(0, 수)}…` : 글);
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
