// 비전 ui-check.json 을 읽고, 찍힌 화면마다 화면 열쇠와 단계를 찾는다 (도메인/호환성 §3.13 「화면 찾기」 · 비전 안내서 10절 「UI 점검」)

import { 주소틀 } from '../../../../scripts/authoring-crawl-rules.js';

export type 점검상태 = 'checking' | 'done' | 'failed' | 'limit';

export interface 의심 {
  kind: string;
  box: number[];
  note: string;
}

export interface 점검화면 {
  before: string;
  at: string;
  status: 'done' | 'failed' | 'skipped';
  issues: 의심[];
  file?: string;
  locator?: { using: string; value: string };
  url?: string;
  game?: { target: string };
}

export interface 점검파일 {
  status: 점검상태;
  screens: 점검화면[];
}

const 글자 = (v: unknown): v is string => typeof v === 'string';
const 객체 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
// 비전이 남긴 그림만 내준다 — 파일 이름으로 폴더 밖을 가리키지 못하게 꼴을 못 박는다 (러너 farmUiCheck.ts 점검화면이름과 같다)
export const 그림이름 = /^ui-[\w-]+\.png$/;

function 화면하나(v: unknown): 점검화면 | null {
  if (!객체(v) || !글자(v.at) || Number.isNaN(Date.parse(v.at))) return null;
  const status = v.status === 'done' || v.status === 'failed' || v.status === 'skipped' ? v.status : null;
  if (status === null) return null;
  const issues = (Array.isArray(v.issues) ? v.issues : []).flatMap((i): 의심[] =>
    객체(i) && 글자(i.kind) ? [{ kind: i.kind, box: Array.isArray(i.box) ? i.box.filter((n): n is number => typeof n === 'number') : [], note: 글자(i.note) ? i.note : '' }] : [],
  );
  return {
    before: 글자(v.before) ? v.before : '',
    at: v.at,
    status,
    issues,
    ...(글자(v.file) && 그림이름.test(v.file) && { file: v.file }),
    ...(객체(v.locator) && 글자(v.locator.using) && 글자(v.locator.value) && { locator: { using: v.locator.using, value: v.locator.value } }),
    ...(글자(v.url) && { url: v.url }),
    ...(객체(v.game) && 글자(v.game.target) && { game: { target: v.game.target } }),
  };
}

/** 꼴이 틀린 파일은 null, 꼴이 틀린 화면 줄은 버린다 */
export function 점검읽기(raw: unknown): 점검파일 | null {
  if (!객체(raw)) return null;
  const status = raw.status;
  if (status !== 'checking' && status !== 'done' && status !== 'failed' && status !== 'limit') return null;
  return { status, screens: (Array.isArray(raw.screens) ? raw.screens : []).flatMap((s) => { const x = 화면하나(s); return x === null ? [] : [x]; }) };
}

/** 그 케이스가 쓰는 화면 파일 하나 — key 는 화면 주소를 주소틀로 바꾼 것, 글은 파일 내용 */
export interface 화면파일 {
  file: string;
  key: string;
  글: string;
}

const 이스케이프 = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 짧은 id(title)가 긴 id(sub_title) 안에서 맞지 않게 앞뒤가 낱말 글자가 아니어야 한다
const 담았나 = (글: string, 값: string) => 값 !== '' && new RegExp(`(^|[^\\w])${이스케이프(값)}($|[^\\w])`).test(글);

/** 둘 이상이면 앞 화면 줄의 파일을 따르고, 그래도 둘이면 모른다 */
function 하나로(후보: 화면파일[], 앞파일: string | null): 화면파일 | null {
  if (후보.length === 1) return 후보[0]!;
  return 후보.find((f) => f.file === 앞파일) ?? null;
}

/**
 * 찍힌 화면의 열쇠. 웹은 주소, 앱은 누른 요소의 locator 를 가진 화면 파일, 게임은 대상 경로 아래 창 · 대상 이름을 가진 파일이다.
 * 못 찾으면 key 가 null 이다. file 은 다음 화면 줄이 「앞 화면 줄과 같은 파일」을 고를 때 쓴다
 */
export function 열쇠찾기(s: 점검화면, 파일들: readonly 화면파일[], 앞파일: string | null): { key: string | null; file: string | null } {
  if (s.url !== undefined) return { key: 주소틀(s.url), file: null };
  let 고른: 화면파일 | null = null;
  if (s.locator !== undefined) {
    // 팜은 짧은 id 에 패키지를 붙여 보낸다(com.x:id/cart) — 화면 파일에는 짧은 쪽(id=cart)이 적힌다
    const 값들 = [s.locator.value, s.locator.value.replace(/^.*:id\//, '')];
    고른 = 하나로(파일들.filter((f) => 값들.some((v) => 담았나(f.글, v))), 앞파일);
  } else if (s.game !== undefined) {
    const t = s.game.target;
    if (t.startsWith('/')) {
      // 경로면 그 아래인 창 가운데 가장 깊은 것 — 창 열쇠는 game:<장면>/<창 경로> 다
      const 아래 = 파일들
        .map((f) => ({ f, 길: f.key.startsWith('game:') ? f.key.replace(/^game:[^/]*/, '') : '' }))
        .filter((x) => x.길 !== '' && (t === x.길 || t.startsWith(`${x.길}/`)))
        .sort((a, b) => b.길.length - a.길.length);
      고른 = 아래.length === 0 ? null : 하나로(아래.filter((x) => x.길.length === 아래[0]!.길.length).map((x) => x.f), 앞파일);
    } else {
      고른 = 하나로(파일들.filter((f) => 담았나(f.글, t)), 앞파일);
    }
  }
  return 고른 === null ? { key: null, file: null } : { key: 고른.key, file: 고른.file };
}

/**
 * 찍은 시각이 든 단계(1부터). 단계 시작은 항목이 끝난 때에서 거꾸로 걸린 시간을 빼 놓는다 — 앞쪽에 연결 · 앱 설치가 끼어
 * 항목 시작에서 세면 단계가 뒤로 밀린다(기기 성능 구간과 같은 까닭). 단계가 없으면 null
 */
export function 단계찾기(at: number, 끝: number, 단계들: readonly { seq: number; durationMs: number }[]): number | null {
  if (단계들.length === 0) return null;
  let 시작 = 끝 - 단계들.reduce((a, s) => a + s.durationMs, 0);
  let 든 = 단계들[0]!.seq;
  for (const s of 단계들) {
    if (at >= 시작) 든 = s.seq;
    시작 += s.durationMs;
  }
  return 든;
}

export interface 화면줄 {
  key: string;
  step: number | null;
  at: string;
  before: string;
  status: 점검화면['status'];
  issues: 의심[];
  file: string | null;
}

/** 파일 하나의 화면 줄을 저장할 꼴로. 못 찾은 화면은 unknown:<tcId>#<단계> 다 */
export function 화면줄들(점검: 점검파일, tcId: string, 파일들: readonly 화면파일[], 끝: number, 단계들: readonly { seq: number; durationMs: number }[]): 화면줄[] {
  let 앞파일: string | null = null;
  return 점검.screens.map((s) => {
    const 찾음 = 열쇠찾기(s, 파일들, 앞파일);
    if (찾음.file !== null) 앞파일 = 찾음.file;
    const step = 단계찾기(Date.parse(s.at), 끝, 단계들);
    return { key: 찾음.key ?? `unknown:${tcId}#${step ?? 0}`, step, at: s.at, before: s.before, status: s.status, issues: s.issues, file: s.file ?? null };
  });
}
