// 게임 지도 찾기 — 작성 AI 가 지도 글(자료 폴더 game-map.txt)을 통째로 읽지 않고 종류별 목차 → 줄 요약 → 줄 전부 차례로 본다 (도메인/게임 §3.10 「게임에 대해 배운 것」 읽기 · 점검)
// 학습 세션이 적었지만 아직 안 올린 줄(game-learned.json)도 얹어 찾는다
// 쓰는 법: npx tsx scripts/authoring-game-find.ts <자료 폴더> [<종류> | <열쇠나 낱말>… | --check [<지금 빌드>]] — 폰 없이 파일만 읽는다. 아무것도 안 주면 목차다
import { pathToFileURL } from 'node:url';

import { type 배운것, 기획서종류, 꼴, 믿음, 요소종류, 표시 } from '../apps/admin/src/prd/gameKinds.js';
import { 게임자리, 요소상한, 지도상한 } from './authoring-game.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

export interface 지도줄 {
  kind: string;
  key: string;
  name: string;
  learned: 배운것 | null;
  /** 지도 글의 그 줄(「- 」 뒤) */
  line: string;
}

const 줄상한 = 240;
const 찾은상한 = 40;
const 배움표 = ' · 배움 {';

/** 배움은 늘 줄 맨 끝의 JSON 이다 — 앞 칸(기획서 값)에 같은 글자가 들었을 수 있어 끝까지 풀리는 자리를 찾는다 */
export function 배움떼기(줄: string): { 앞: string; learned: 배운것 | null } {
  for (let i = 줄.indexOf(배움표); i >= 0; i = 줄.indexOf(배움표, i + 1)) {
    try {
      return { 앞: 줄.slice(0, i), learned: JSON.parse(줄.slice(i + 배움표.length - 1)) as 배운것 };
    } catch {
      // 기획서 값 안의 글자다 — 다음 자리를 본다
    }
  }
  return { 앞: 줄, learned: null };
}

/** 서버 지도글(apps/admin/src/prd/gameMap.ts)의 꼴을 거꾸로 읽는다 */
export function 지도읽기(글: string): { 줄들: 지도줄[]; 이름: Map<string, string> } {
  const 줄들: 지도줄[] = [];
  const 이름 = new Map<string, string>(Object.entries(요소종류));
  let kind = '';
  for (const 줄 of 글.split('\n')) {
    const 머리 = /^## (.+) \(([A-Z_]+)\) — \d+개$/.exec(줄);
    if (머리) {
      kind = 머리[2]!;
      이름.set(kind, 머리[1]!);
      continue;
    }
    const m = /^- (.+?) · (.+)$/.exec(줄);
    if (!m || kind === '') continue;
    const { 앞, learned } = 배움떼기(m[2]!);
    줄들.push({ kind, key: m[1]!, name: 앞.split(' · ')[0]!, learned, line: 줄.slice(2) });
  }
  return { 줄들, 이름 };
}

/** 줄에 적힌 근거 요구 번호 — 배움 앞에서만 본다 */
export const 근거들 = (x: 지도줄): string[] => / · 근거 (.+?)(?= · |$)/.exec(배움떼기(x.line).앞)?.[1]?.split(', ') ?? [];

interface 적은줄 {
  kind: string;
  key: string;
  name: string;
  learned: 배운것 | null;
  reqIds?: string[];
}

/** 아직 안 올린 배운 줄 — 적는 명령(authoring-learn-note)이 검사해 쓴 파일이다. 없거나 못 읽으면 빈 목록 */
export function 적은줄들(글: string | null): 적은줄[] {
  try {
    const 몸 = JSON.parse(글 ?? '{}') as { elements?: unknown };
    return (Array.isArray(몸.elements) ? (몸.elements as 적은줄[]) : []).filter(
      // 자식이 파일을 직접 고쳤을 수 있다 — 꼴이 틀린 줄은 버린다
      (e) =>
        typeof e?.kind === 'string' && typeof e.key === 'string' && typeof e.name === 'string' &&
        (e.learned === null || (typeof e.learned === 'object' && typeof e.learned.text === 'string')) &&
        (e.reqIds === undefined || (Array.isArray(e.reqIds) && e.reqIds.every((r) => typeof r === 'string'))),
    );
  } catch {
    return [];
  }
}

/** 올리기 전의 줄을 지도에 얹는다 — 배운 것은 새것이 이기고, 지운 줄(null)은 기획서 몫이 있으면 배움만 뗀다 */
export function 얹기(지도: ReturnType<typeof 지도읽기>, 적은: readonly 적은줄[]): ReturnType<typeof 지도읽기> {
  const 줄들 = new Map(지도.줄들.map((x) => [x.key, x]));
  const 이름 = new Map(지도.이름);
  for (const e of 적은) {
    const 옛 = 줄들.get(e.key);
    if (e.kind === 'KIND' && e.learned !== null) 이름.set(e.key.slice('kind:'.length), e.name);
    // 기획서에서 온 다섯 종류 줄은 배운 것만 올려서는 종류와 이름이 안 바뀐다(서버 요소넣기와 같다)
    const 기획서줄 = 옛 !== undefined && 기획서종류.has(옛.kind);
    // 근거를 실은 배운 줄은 서버가 근거를 새것으로 바꾸고 「기획서가 바뀜」을 비운다 — 기획서 줄에는 적는 명령이 근거를 안 싣는다
    const 앞 = 옛 === undefined || (!기획서줄 && e.reqIds !== undefined) ? `${e.key} · ${e.name}${(e.reqIds ?? []).length === 0 ? '' : ` · 근거 ${e.reqIds!.join(', ')}`}` : 배움떼기(옛.line).앞;
    if (e.learned === null) {
      if (옛 !== undefined && / · (기획서|근거) /.test(앞)) 줄들.set(e.key, { ...옛, learned: null, line: 앞 });
      else 줄들.delete(e.key);
      continue;
    }
    줄들.set(e.key, { kind: 기획서줄 ? 옛.kind : e.kind, key: e.key, name: 기획서줄 ? 옛.name : e.name, learned: e.learned, line: `${앞}${배움표.slice(0, -1)}${JSON.stringify(e.learned)}` });
  }
  return { 줄들: [...줄들.values()], 이름 };
}

/** 자료 폴더의 지도 글에 아직 안 올린 배운 줄을 얹어 읽는다. 지도 글이 없으면 null */
export function 지금지도(자료: string): ReturnType<typeof 지도읽기> | null {
  const 글 = 안전히읽기(자료, 게임자리.지도, 지도상한);
  return 글 === null ? null : 얹기(지도읽기(글), 적은줄들(안전히읽기(자료, 게임자리.배운글, 요소상한)));
}

/** 학습 세션에 에이전트가 남긴 「정리하라」 알림 — 배우는 AI 는 자기 시계 · 컨텍스트를 못 봐 명령 출력으로 안다 */
export const 정리알림 = (자료: string): string[] => {
  const 글 = 안전히읽기(자료, 게임자리.학습알림, 1_000)?.trim();
  return 글 === undefined || 글 === '' ? [] : [`※ ${글}`];
};

const 배움요약 = (l: 배운것): string =>
  [l.belief === undefined ? null : 믿음[l.belief], l.seen === undefined ? null : `${l.seen}번 봄`, l.shape === undefined ? null : 꼴[l.shape], ...(l.marks ?? []).map((m) => 표시[m]), l.build === undefined ? null : `빌드 ${l.build}`]
    .filter((x) => x !== null)
    .join(' · ');

export const 바뀜 = (x: 지도줄): string | null => / · 기획서가 바뀜\(([^)]*)\)/.exec(배움떼기(x.line).앞)?.[1] ?? null;
const 자름 = (글: string): string => (글.length > 줄상한 ? `${글.slice(0, 줄상한)}…` : 글);
const 요약줄 = (x: 지도줄): string => {
  // 고칠 줄 표시는 줄이 길어 잘려도 남게 앞에 둔다
  const 표 = 바뀜(x) === null ? '' : `기획서가 바뀜(${바뀜(x)!}) · `;
  const 앞 = `- ${표}`;
  return 자름(x.learned === null ? `${앞}${x.line}` : `${앞}${x.key} · ${x.name} · [${배움요약(x.learned)}] ${x.learned.text}${x.line.includes(' · 기획서 ') ? ' · 기획서 값 있음' : ''}`);
};

/** 종류마다 줄 수와 믿음 — 비어 있는 기본 종류도 찍는다. 빈 종류가 곧 배울 것이다 */
export function 목차(지도: ReturnType<typeof 지도읽기>): string[] {
  return [
    `# 게임 지도 목차 — ${지도.줄들.length}줄. 기대값의 근거가 아니다`,
    ...[...지도.이름].map(([kind, 이름]) => {
      const 들 = 지도.줄들.filter((x) => x.kind === kind);
      const 믿음수 = (Object.keys(믿음) as (keyof typeof 믿음)[]).flatMap((b) => {
        const 수 = 들.filter((x) => x.learned?.belief === b).length;
        return 수 === 0 ? [] : [`${믿음[b]} ${수}`];
      });
      return `- ${kind} ${이름} — ${들.length === 0 ? '비어 있음' : `${들.length}줄`}${믿음수.length === 0 ? '' : ` (${믿음수.join(' · ')})`}`;
    }),
  ];
}

/** 종류 이름이면 그 종류의 요약, 열쇠면 그 줄 전부, 그 밖의 낱말은 열쇠 · 이름 · 배운 글에 든 줄의 요약 */
export function 찾기(지도: ReturnType<typeof 지도읽기>, 찾을: readonly string[]): string[] {
  return 찾을.flatMap((말) => {
    const 줄 = 지도.줄들.find((x) => x.key === 말);
    if (줄 !== undefined) return [`- ${줄.line}`];
    const 종류 = 지도.이름.has(말);
    const 들 = 지도.줄들.filter((x) => (종류 ? x.kind === 말 : [x.key, x.name, x.learned?.text ?? ''].some((t) => t.includes(말))));
    if (들.length === 0) return [`없음: ${말}`];
    const 보임 = 종류 ? 들 : 들.slice(0, 찾은상한);
    return [`# ${말} — ${들.length}줄`, ...보임.map(요약줄), ...(들.length > 보임.length ? [`(나머지 ${들.length - 보임.length}줄 — 낱말을 좁힌다)`] : [])];
  });
}

/** 줄 안 「기획서 <JSON>」 값 — 배움 앞에서만 찾는다. 값 안에 「 · 」가 들 수 있어 풀리는 자리까지 넓힌다 */
function 기획서값(x: 지도줄): unknown {
  const 칸들 = (배움떼기(x.line).앞.split(' · 기획서 ').slice(1).join(' · 기획서 ')).split(' · ');
  for (let i = 1; i <= 칸들.length; i++) {
    try {
      return JSON.parse(칸들.slice(0, i).join(' · ')) as unknown;
    } catch {
      // 값 안의 「 · 」다 — 한 칸 더 잇는다
    }
  }
  return undefined;
}

const 객체인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 고칠 줄 — 기획서가 바뀜 · 근거 없음 · 올릴 것(두 번 봤는데 덜 봄) · 값 다름 · 빌드 다름(재확인) · 지도에 없는 관련 열쇠 · 줄이 셋 밑인 만든 종류 */
export function 점검(지도: ReturnType<typeof 지도읽기>, 빌드?: string): string[] {
  const 열쇠들 = new Set(지도.줄들.map((x) => x.key));
  const 짚음: string[] = [];
  for (const x of 지도.줄들) {
    const 바뀐 = 바뀜(x);
    if (바뀐 !== null) 짚음.push(`기획서가 바뀜: ${x.key} — ${바뀐}`);
    if (/ · 서버 .+ 다름( \(실행 #\d+\))?( · |$)/.test(배움떼기(x.line).앞)) 짚음.push(`값 다름: ${x.key} — 기획서 값과 서버 값`);
    const l = x.learned;
    if (l === null || x.kind === 'KIND') continue;
    if (l.belief === 'SEEN' || l.belief === 'CONFIRMED') {
      const 빠짐 = [l.data === undefined ? '잰 값' : null, (l.seen ?? 0) === 0 ? '본 횟수' : null, l.build === undefined ? '빌드' : null].filter((v) => v !== null);
      if (빠짐.length > 0) 짚음.push(`근거 없음: ${x.key} — ${믿음[l.belief]}인데 ${빠짐.join(' · ')} 없음`);
      else if (l.belief === 'CONFIRMED' && l.seen! < 2) 짚음.push(`근거 없음: ${x.key} — 확인인데 한 번 봄`);
    }
    // 두 번 넘게 쟀는데 「덜 봄」에 멈춘 줄은 PRD 로 못 간다 — 네 번째 실측에서 23줄이었다(2026-11-25 GAME-F6-05)
    if (l.belief === 'SEEN' && x.kind !== 'ASK' && (l.seen ?? 0) >= 2 && l.data !== undefined && l.build !== undefined && (l.shape === undefined || l.shape === 'FIXED') && !(l.marks ?? []).includes('CHEAT'))
      짚음.push(`올릴 것: ${x.key} — ${l.seen}번 봤는데 덜 봄. 조건을 바꿔 원래 속도로 한 번 더 재고 맞으면 확인으로`);
    if (빌드 !== undefined && l.build !== undefined && l.build !== 빌드) 짚음.push(`빌드 다름: ${x.key} — ${l.build} 에서 봄, 지금 ${빌드} · 재확인`);
    const 기획 = 기획서값(x);
    const 잰 = l.data;
    if (객체인가(기획) && 객체인가(잰)) {
      const 다른 = Object.keys(기획).filter((k) => Object.hasOwn(잰, k) && JSON.stringify(기획[k]) !== JSON.stringify(잰[k]));
      if (다른.length > 0) 짚음.push(`값 다름: ${x.key} — 기획서 값과 배운 값(${다른.join(', ')})`);
    } else if (기획 !== undefined && 잰 !== undefined && !객체인가(기획) && !객체인가(잰) && JSON.stringify(기획) !== JSON.stringify(잰)) {
      짚음.push(`값 다름: ${x.key} — 기획서 값과 배운 값`);
    }
    const 없는 = (l.related ?? []).filter((k) => !열쇠들.has(k));
    if (없는.length > 0) 짚음.push(`관련 열쇠 없음: ${x.key} — ${없는.join(', ')}`);
  }
  for (const [kind, 이름] of 지도.이름) {
    const 수 = 지도.줄들.filter((x) => x.kind === kind).length;
    if (Object.hasOwn(요소종류, kind)) continue;
    if (!열쇠들.has(`kind:${kind}`)) 짚음.push(`만든 종류: ${kind} — 정의 줄(kind:${kind})이 없다`);
    if (수 < 3) 짚음.push(`만든 종류: ${kind} ${이름} — ${수}줄이다. 셋이 안 되면 기본 종류로 되돌린다`);
  }
  // 정의만 있고 줄이 없는 종류는 지도 글에 머리가 없다
  for (const x of 지도.줄들) if (x.kind === 'KIND' && !지도.이름.has(x.key.slice('kind:'.length))) 짚음.push(`만든 종류: ${x.key} — 쓰는 줄이 없다. 되돌린다`);
  return [`# 게임 지도 점검 — ${짚음.length}건${빌드 === undefined ? ' · 빌드를 안 줘 빌드 다름은 안 봄' : ''}`, ...짚음];
}

function main(): void {
  const [자료, ...나머지] = process.argv.slice(2);
  const 지도 = 자료 === undefined ? null : 지금지도(자료);
  if (지도 === null) {
    console.error('쓰는 법: npx tsx scripts/authoring-game-find.ts <자료 폴더> [<종류> | <열쇠나 낱말>… | --check [<지금 빌드>]] — 자료 폴더에 game-map.txt 가 있어야 한다');
    process.exit(2);
  }
  const 줄들 = 나머지.length === 0 ? 목차(지도) : 나머지[0] === '--check' ? 점검(지도, 나머지[1]) : 찾기(지도, 나머지);
  console.log([...줄들, ...정리알림(자료!)].join('\n'));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main();
