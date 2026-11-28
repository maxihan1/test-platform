// 시뮬레이션 돌리기 — 손 시간 · 걷는 속도는 판 기록에서 재고, 걷는 거리는 격자 길찾기로 내고, 순서 찾기(kit gameplay)가 고른 순서를 줄로 낸다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 계산기(authoring-game-calc.ts 의 `시뮬`) · 게이트(authoring-learn-sim.ts)가 같이 쓴다. 엔진 · 순서 찾기 · 순서대로 하기는 케이스도 쓰게 `packages/kit/src/gameplay` 에 있다
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { 막음안, 훑기읽기 } from './authoring-game-nav-file.js';
import { 곳격자, 길내기, 맨쌍글 } from './authoring-game-path.js';
import { type 걷는거리, type 모델, type 시뮬결과, type 잰손, type 점, type 행동, 느린손배, 돌리기, 빌드머리, 손넣기, 손셈, 순서표, 엔진판, 입력읽기, 기본세계글, 정책글, 세계오류면, 찾기, 표글, 행동초첫값 } from '@platform/kit/gameplay';
import { type 지도줄, 지금지도 } from './authoring-game-find.js';
import { 게임자리 } from './authoring-game.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';
import { type 판기록, 판기록들 } from './authoring-learn-check.js';
import { 놀이시작뒤 } from './authoring-learn-io.js';
import { type 재현비교, 비교표글, 어긋남글, 재현비교하기, 판값들 } from './authoring-game-sim-compare.js';
import { type 맞출판, type 맞춘결과, 맞출값읽기, 맞출판수, 맞춘글, 맞춘입력, 숫자맞추기 } from './authoring-game-sim-fit.js';
import { 계획곳 } from './authoring-learn-play.js';

export { type 잰손, 손넣기, 손셈, 행동초첫값 };

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 점읽기 = (v: unknown): 점 | undefined => (Array.isArray(v) && v.length >= 2 && 수(v[0]) && 수(v.at(-1)) ? [v[0], v.at(-1) as number] : undefined);

/** 판의 행동기록 — 순서대로 하기가 남긴 것(따라감.행동기록)이 먼저, 없으면 판 함수가 돌려준 값.행동기록(옛 판). 틀린 항목은 버린다. 옛 판 함수는 안 된 행동을 안됨: true 로 적었다 */
export function 행동기록읽기(r: 판기록): 행동[] | null {
  const 들 = 객체(r.따라감).행동기록 ?? 객체(r.값).행동기록;
  if (!Array.isArray(들)) return null;
  return 들.flatMap((v) => {
    const x = 객체(v);
    if (!수(x.초) || typeof x.행동 !== 'string') return [];
    const 자 = 점읽기(x.자리);
    const 자들 = Array.isArray(x.자리들) ? x.자리들.map(점읽기).filter((p): p is 점 => p !== undefined) : undefined;
    return [{ 초: x.초, 행동: x.행동, ...(typeof x.대상 === 'string' ? { 대상: x.대상 } : {}), ...(자 === undefined ? {} : { 자리: 자 }), ...(자들 === undefined ? {} : { 자리들: 자들 }), ...(수(x.시작초) ? { 시작초: x.시작초 } : {}), ...(수(x.도착초) ? { 도착초: x.도착초 } : {}), ...(수(x.끝초) ? { 끝초: x.끝초 } : {}), ...(typeof x.됨 === 'boolean' ? { 됨: x.됨 } : x.안됨 === true ? { 됨: false } : {}), ...(수(x.걸음) ? { 걸음: x.걸음 } : {}) }];
  });
}

/** 한 판을 여러 번에 나눠 돌았으면(시간 한도에서 멈췄다 이어 함) 앞 기록의 행동부터 이어 붙인다 — 재현이 판 처음부터 따라 하게 */
export function 판행동기록(기록들: readonly 판기록[], r: 판기록): 행동[] | null {
  const 내것 = 행동기록읽기(r);
  const 앞이름 = 객체(r.따라감).이어;
  const 앞 = typeof 앞이름 === 'string' ? 기록들.find((x) => x.이름 === 앞이름 && x.이름 < r.이름) : undefined;
  return 내것 === null || 앞 === undefined ? 내것 : [...(판행동기록(기록들, 앞) ?? []), ...내것];
}

/** 이어 부른 판이면 앞 조각부터 — 재현 비교가 조각마다 값기록 시계를 맞춘다 */
export function 판조각들(기록들: readonly 판기록[], r: 판기록): 판기록[] {
  const 앞이름 = 객체(r.따라감).이어;
  const 앞 = typeof 앞이름 === 'string' ? 기록들.find((x) => x.이름 === 앞이름 && x.이름 < r.이름) : undefined;
  return 앞 === undefined ? [r] : [...판조각들(기록들, 앞), r];
}

/** 숫자 맞추기에 쓸 판 — 그 곳을 계획으로 돈 판 가운데 행동기록과 시뮬과 이을 값기록이 있는 가장 새 판들(이어 부른 판은 끝 조각 하나로 · 치트 판은 빼고) */
export function 맞출판들(자료: string, m: 모델): 맞출판[] {
  const 지도 = 지금지도(자료);
  if (지도 === null) return [];
  const 기록들 = 판기록들(자료);
  const 이어진 = new Set(기록들.map((r) => 객체(r.따라감).이어).filter((x): x is string => typeof x === 'string'));
  return 기록들
    .flatMap((r): 맞출판[] => {
      if (r.값기록 === undefined || r.치트 === true || 이어진.has(r.이름) || 계획곳(지도.줄들, r.값기록.계획) !== m.곳) return [];
      const 행 = 판행동기록(기록들, r);
      if (행 === null || 행.length === 0) return [];
      const 조각들 = 판조각들(기록들, r).flatMap((x) => (x.값기록 === undefined ? [] : [{ 값기록: x.값기록, 따라감: x.따라감 }]));
      const 판 = 판값들(조각들, m.볼값연결, Math.max(...행.map((x) => x.끝초 ?? x.초)));
      return 판.length === 0 ? [] : [{ 이름: r.이름, 판, 행 }];
    })
    .slice(-맞출판수);
}

/** 그 판을 재현해(행동기록을 그 시각에 그대로) 판 값기록과 같은 시각끼리 견준다. 행동기록이 없으면 null · 볼값을 못 이으면 비교.본수 0 */
export function 판재현(m: 모델, 걷기: 걷는거리 | undefined, 기록들: readonly 판기록[], r: 판기록): { 결과: 시뮬결과; 행: 행동[]; 비교: 재현비교 } | null {
  const 행 = 판행동기록(기록들, r);
  if (행 === null || 행.length === 0) return null;
  const 결과 = 돌리기(m, [], 걷기, 행);
  const 조각들 = 판조각들(기록들, r).flatMap((x) => (x.값기록 === undefined ? [] : [{ 값기록: x.값기록, 따라감: x.따라감 }]));
  const 행동끝 = Math.max(...행.map((x) => x.끝초 ?? x.초));
  return { 결과, 행, 비교: 재현비교하기(판값들(조각들, m.볼값연결, 행동끝), 결과, m.볼값연결, 행, m.지킬것.체력) };
}

/**
 * 손 — 그 곳을 적은 계획으로 해 본 새 판(놀이시작 뒤) 가운데 행동기록이 있는 가장 새 판에서 잰다. 그 곳 판이 없으면 다른 곳의 가장 새 판(같은 게임 · 같은 손이다).
 * 지난 판의 바퀴 시간표는 안 쓴다(2026-11-28 사용자 — 정책을 받은 판 함수는 읽고 쉬는 시간이 없다)
 */
export function 손재기(자료: string, 곳: string): 잰손 {
  const 지도 = 지금지도(자료);
  if (지도 === null) return { 행동초: 행동초첫값 };
  // 안 된 행동만 있는 판은 잴 것이 없다 — 그 판을 고르면 앞 판에서 잰 값을 두고 첫 값으로 돌아간다
  const 판들 = [...놀이시작뒤(자료, 판기록들(자료))].reverse().filter((r) => r.값기록 !== undefined && 손셈(행동기록읽기(r) ?? []) !== null);
  const 판 = 판들.find((r) => 계획곳(지도.줄들, r.값기록!.계획) === 곳) ?? 판들[0];
  const 잰 = 판 === undefined ? null : 손셈(행동기록읽기(판)!);
  return 잰 === null ? { 행동초: 행동초첫값 } : { ...잰, 기록: 판!.이름 };
}

/** 맵 훑기의 못 심는 곳 안 자리후보를 뺀다 — 판에서 놓기가 안 될 자리를 시뮬이 고르지 않게(authoring-game-nav.ts). 계산기 · 판 여는 검사가 같이 부른다 */
export function 못심는곳빼기(자료: string, m: 모델): { 모델: 모델; 뺀: number } {
  const 못 = 훑기읽기(자료, m.곳)?.못심음 ?? [];
  const 남은 = m.자리후보.filter((p) => !못.some((s) => 막음안(s, p)));
  return { 모델: 남은.length === m.자리후보.length ? m : { ...m, 자리후보: 남은 }, 뺀: m.자리후보.length - 남은.length };
}

/** 격자 길찾기로 걷는 거리와 거쳐 갈 점 — 칸 쌍마다 한 번만 찾는다. 격자를 못 지으면 곧은 거리(길은 없다 · 조작 도우미가 곧게 간다) */
export function 격자걷기(자료: string, m: 모델): { 걷기: 걷는거리; 글: string; 길?: (a: 점, b: 점) => readonly 점[] | null } {
  const 덧: 점[] = [m.지킬것.자리, m.캐릭터.자리, ...m.자리후보, ...Object.values(m.길).flat()];
  const g = 곳격자(자료, m.곳, 덧);
  const 곧은: 걷는거리 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (typeof g === 'string') return { 걷기: 곧은, 글: `격자를 못 지어 곧은 거리로 걸었다 — ${g}` };
  const 표 = new Map<string, number>();
  return {
    글: ['걷는 거리는 격자 길찾기', ...맨쌍글(g)].join(' · '),
    걷기: (a, b) => {
      const 열쇠 = `${Math.floor(a[0])},${Math.floor(a[1])}>${Math.floor(b[0])},${Math.floor(b[1])}`;
      let d = 표.get(열쇠);
      if (d === undefined) {
        const r = 길내기(g, a, b);
        // 길이 없으면 못 간다 — 곧은 거리 × 3 으로 치면 물 건너 섬에도 닿아 그곳 적을 쳤다(2026-11-28 16105 첫 맵). 판에서 걸은 칸은 막힘을 덮으니 실제로 건넌 다리는 열려 있다
        d = '길이' in r ? r.길이 : Infinity;
        표.set(열쇠, d);
      }
      return d;
    },
    // 판에서 손이 같은 길로 걷게 거쳐 갈 점을 낸다(2026-11-29 사용자 — 손이 곧게 가다 막혔다 · kit followWalk)
    길: (a, b) => { const r = 길내기(g, a, b); return '점들' in r ? r.점들 : null; },
  };
}

/** 측정 값을 담지 않는 줄 종류 — 유지 근거로 받지 않는다(곳 · 계획 · 회고 · 물음 · 목표 · 계산 줄을 적어 근거를 채우지 못하게) */
const 근거아닌종류 = new Set(['STAGE', 'TRIAL', 'PLAY', 'ASK', 'GOAL', 'CALC', 'KIND']);
export const 빌드글 = (자료: string): string | null => 안전히읽기(자료, 게임자리.빌드데이터, 200_000_000);
const 빌드읽기 = (글: string | null): unknown => {
  if (글 === null) return undefined;
  try { return JSON.parse(글) as unknown; } catch { return undefined; }
};
/** 빌드 데이터에서 키가 그 이름과 꼭 같은 첫 값(묶음 안까지) — 글자 일부만 맞는 이름(「Speed」)을 받지 않는다 */
function 빌드타입(o: unknown, 이름: string): unknown {
  if (이름 === '' || o === null || typeof o !== 'object') return undefined;
  if (!Array.isArray(o) && Object.hasOwn(o, 이름)) return (o as Record<string, unknown>)[이름];
  for (const v of Object.values(o)) {
    const 찾음 = 빌드타입(v, 이름);
    if (찾음 !== undefined) return 찾음;
  }
  return undefined;
}
const 숫자있음 = (o: unknown, 수: number): boolean => (typeof o === 'number' ? Math.abs(o - 수) < 1e-6 : o !== null && typeof o === 'object' && Object.values(o).some((v) => 숫자있음(v, 수)));

/**
 * 유지 · 설치물둘레 · 캐릭터(걷기속도) 값이 잰 값인지 — 근거가 측정 줄(규칙 · 시간 · 값 줄 따위)의 지도 열쇠이거나 `빌드 데이터:<타입 이름>`(빌드 데이터에 그 이름이 있다)이어야 한다.
 * 16102 는 지침 본보기 숫자를 베끼고 마지막 레벨 유지없음을 빠뜨려 깬 맵까지 이기는 안이 없다고 냈다. 지도 열쇠 근거는 지도를 못 읽으면 못 봐 안 받는다
 */
export function 근거틀림(m: 모델, 줄들: readonly Pick<지도줄, 'kind' | 'key' | 'learned'>[] | null, 빌드: string | null): string | null {
  const 근거들 = [...Object.values(m.설치물종류).flatMap((t) => (t.유지 === undefined ? [] : [t.유지.근거])), ...(m.설치물둘레 === undefined ? [] : [m.설치물둘레.근거]), ...(m.캐릭터.근거 === undefined ? [] : [m.캐릭터.근거])];
  const 빌드값 = 빌드읽기(빌드);
  const 틀린 = 근거들.filter((k) => {
    if (k.startsWith(빌드머리)) return 빌드타입(빌드값, k.slice(빌드머리.length).trim()) === undefined;
    const 줄 = 줄들?.find((x) => x.key === k && x.learned !== null);
    return 줄 === undefined || 근거아닌종류.has(줄.kind);
  });
  // 빌드 데이터 근거의 걷기속도는 판에서 잰 값으로 안 덮이니 그 타입 안의 값이어야 한다(지어낸 빠른 걷기를 막는다)
  const 캐 = m.캐릭터;
  if (틀린.length === 0 && 캐.근거?.startsWith(빌드머리) === true && !숫자있음(빌드타입(빌드값, 캐.근거.slice(빌드머리.length).trim()), 캐.걷기속도)) return `캐릭터 걷기속도 ${캐.걷기속도} 가 근거 ${캐.근거} 의 값에 없다 — 빌드 데이터의 그 타입 값(걷기 속도 칸)을 그대로 적는다`;
  if (틀린.length === 0) return null;
  if (줄들 === null && 틀린.some((k) => !k.startsWith(빌드머리))) return `지도를 못 읽어 유지 · 설치물둘레 · 캐릭터 근거 ${틀린.join(' · ')} 를 못 봤다 — 자료 폴더의 game-calc 안에서 다시 계산한다`;
  return `유지 · 설치물둘레 · 캐릭터 근거 ${틀린.join(' · ')} 가 잰 값의 출처가 아니다 — 판 · 지도에서 잰 값이면 그 측정 줄(규칙 · 시간 · 값 줄) 열쇠, 빌드 데이터면 「빌드 데이터:<타입 이름>」을 적는다(곳 · 계획 · 계산 줄은 안 받는다 · 지침 본보기 숫자를 쓰지 않는다)`;
}

/**
 * 입력의 세계(게임 세계 코드 파일 이름 — 입력 파일과 같은 폴더)를 읽어 세계글로 넣는다. 세계가 없으면 그대로(본보기 세계).
 * 파일 이름만 받는다 — 폴더를 넘나들어 작성 폴더 밖 파일을 읽지 못하게. 해시는 줄에 남겨 게이트가 줄을 낸 뒤 세계 코드가 바뀌었나 본다
 */
export function 세계넣기(입력: Record<string, unknown>, 입력폴더: string | undefined): { 입력: Record<string, unknown>; 세계?: { 파일: string; 해시: string } } | { 틀림: string } {
  // 세계 파일이 없으면 본보기 세계의 해시를 남긴다 — 본보기 세계가 바뀌면 게이트가 옛 줄을 다시 계산하게
  if (입력.세계 === undefined) return { 입력, 세계: { 파일: '본보기 세계', 해시: 해시(기본세계글) } };
  if (typeof 입력.세계 !== 'string' || !/^[^/\\]+\.js$/.test(입력.세계) || 입력.세계.startsWith('.')) return { 틀림: '세계 는 입력 파일과 같은 폴더에 둔 게임 세계 코드 파일 이름이다(예: "catsgo.world.js" — 폴더를 넘나들지 않는다)' };
  if (입력폴더 === undefined) return { 틀림: '세계 파일은 입력 파일과 같은 폴더에서 읽는다 — 입력을 파일로 준다' };
  let 글: string;
  try {
    글 = readFileSync(join(입력폴더, 입력.세계), 'utf8');
  } catch (e) {
    return { 틀림: `세계 파일 ${입력.세계} 을 못 읽었다 — ${e instanceof Error ? e.message : String(e)}` };
  }
  const { 세계: _세계, ...남은 } = 입력;
  return { 입력: { ...남은, 세계글: 글 }, 세계: { 파일: 입력.세계, 해시: 해시(글) } };
}

/** 입력 파일 해시 — 게이트가 시뮬 줄을 낸 뒤 입력이 바뀌었나 본다 */
export const 해시 = (글: string): string => createHash('sha256').update(글).digest('hex').slice(0, 16);

const 웨이브글 = (r: 시뮬결과): string[] => r.웨이브.map((w) => `  ${w.이름} 처치 ${w.처치} · 새어 나감 ${w.새어나감} · 끝 지킬것 ${w.끝지킬것} · 끝 재화 ${w.끝재화} · ${w.끝초}초`);
export const 짐글 = (r: Pick<시뮬결과, '짐'>): string => (r.짐 === undefined ? '' : r.짐.시간넘음 === true ? `${r.짐.웨이브} 에서 ${r.짐.초}초가 넘도록 안 끝남` : `${r.짐.웨이브} ${r.짐.초}초에 지킬것 0 · 그 웨이브에서 새어 나간 적의 남은 체력 ${r.짐.새어나간체력} · 쥔 재화 ${r.짐.쥔재화}`);
const 손글 = (잰: 잰손): string => `행동 하나 ${잰.행동초}초${잰.종류별 === undefined ? '' : `(${Object.entries(잰.종류별).map(([k, v]) => `${k} ${v}`).join(' · ')})`}${잰.걷기속도 === undefined ? '' : ` · 걷는 속도 ${잰.걷기속도}`}(${잰.기록 === undefined ? '잰 판 없음 · 첫 값' : `${잰.기록} 에서 잼`})`;

/**
 * 계산기의 `시뮬` — 입력 파일이 `<자료 폴더>/game-calc/<이름>.json` 이면 손 시간 · 격자 · 재현 기록을 그 자료 폴더에서 읽는다.
 * 결과는 CALC 줄 data 에 그대로 실리니 판마다 늘어나는 예상 · 행동기록은 안 싣는다(게이트가 다시 돌려 얻는다)
 */
export function 시뮬계산(...a: Parameters<typeof 시뮬계산안>): ReturnType<typeof 시뮬계산안> {
  return 세계오류면(() => 시뮬계산안(...a), (글) => ({ 틀림: 글 }));
}
function 시뮬계산안(모델: 모델, 자료: string | undefined, 파일글: string, 파일: string, 넣은입력?: Record<string, unknown>, 세계?: { 파일: string; 해시: string }): { 글: string; 줄글: string[]; 결과: Record<string, unknown>; 입력요약: Record<string, unknown> } | { 틀림: string } {
  if (자료 !== undefined) {
    const 틀 = 근거틀림(모델, 지금지도(자료)?.줄들 ?? null, 빌드글(자료));
    if (틀 !== null) return { 틀림: 틀 };
  }
  const 잰: 잰손 = 자료 === undefined ? { 행동초: 행동초첫값 } : 손재기(자료, 모델.곳);
  const 뺌 = 자료 === undefined ? { 모델, 뺀: 0 } : 못심는곳빼기(자료, 모델);
  let m = 손넣기(뺌.모델, 잰);
  const 걸음 = 자료 === undefined ? { 걷기: undefined, 글: '자료 폴더 밖 입력이라 곧은 거리로 걸었다' } : 격자걷기(자료, m);
  // 맞추기에 적은 못 잰 값은 그 곳 판들의 재현 오차가 가장 작은 값으로 바꿔 넣고 계산한다 — 맞춘 값은 줄에 남아 게이트 · 케이스가 같은 값을 쓴다
  const 원입력 = 넣은입력 ?? (JSON.parse(파일글) as Record<string, unknown>);
  const 맞출들 = 맞출값읽기(원입력);
  if ('틀림' in 맞출들) return 맞출들;
  let 맞춤: 맞춘결과 | undefined;
  if (맞출들.length > 0) {
    맞춤 = 숫자맞추기(원입력, 맞출들, 자료 === undefined ? [] : 맞출판들(자료, 모델), 잰, 걸음.걷기);
    const 맞춘모델 = 입력읽기(맞춘입력(원입력, 맞출들, 맞춤.값));
    if ('틀림' in 맞춘모델) return 맞춘모델;
    m = 손넣기(자료 === undefined ? 맞춘모델 : 못심는곳빼기(자료, 맞춘모델).모델, 잰);
  }
  let 재현: { 기록: string; 이김: boolean; 웨이브수: number; 짐?: 시뮬결과['짐']; 맞음?: boolean; 어긋남?: 재현비교['어긋남'] } | undefined;
  const 줄글: string[] = [...(자료 === undefined ? ['이 입력은 <자료 폴더>/game-calc/ 밖에 있다 — 이 줄로는 판이 안 돈다(조작 도우미가 그 자리에서 입력을 다시 읽는다). 입력을 그 폴더로 옮겨 다시 계산한다'] : []), `손 — ${손글({ ...잰, 행동초: m.손.행동초 })} · ${걸음.글}${뺌.뺀 === 0 ? '' : ` · 맵 훑기의 못 심는 곳이라 자리후보 ${뺌.뺀}개를 뺐다`}`, ...(맞춤 === undefined ? [] : 맞춘글(맞출들, 맞춤))];
  if (m.재현 !== undefined) {
    const 판들 = 자료 === undefined ? [] : 판기록들(자료);
    const 판 = 판들.find((r) => r.이름 === m.재현!.기록);
    const 재 = 판 === undefined ? null : 판재현(m, 걸음.걷기, 판들, 판);
    if (재 === null) return { 틀림: `재현.기록 ${m.재현.기록} 판 기록에 행동기록이 없다 — 순서대로 하기가 남긴 행동기록을 그대로 따라 돌린다` };
    const { 결과: r, 행, 비교 } = 재;
    재현 = { 기록: m.재현.기록, 이김: r.이김, 웨이브수: r.웨이브.length, ...(r.짐 === undefined ? {} : { 짐: r.짐 }), ...(비교.본수 === 0 ? {} : { 맞음: 비교.맞음, ...(비교.어긋남 === null ? {} : { 어긋남: 비교.어긋남 }) }) };
    줄글.push(
      `재현 ${m.재현.기록} — 판 행동기록 ${행.length}개를 그대로 했다 → ${r.이김 ? '이김' : 짐글(r)}`,
      ...웨이브글(r),
      비교.본수 === 0
        ? '재현 비교 — 판 값기록을 시뮬과 못 이었다(볼값연결 이름이 그 판 계획의 볼값 이름과 같아야 한다) · 웨이브 수로만 견준다'
        : 비교.맞음
          ? `재현 비교 — 판과 맞는다(${비교.본수}번 견줌)`
          : `재현 비교 — 판과 어긋난다: ${어긋남글(비교.어긋남!)}. 재현이 맞을 때까지 아래 순서는 믿을 수 없다(게이트가 판을 막는다)`,
      ...비교표글(비교),
    );
  }
  const 찾음 = 찾기(m, 걸음.걷기);
  if ('틀림' in 찾음) return 찾음;
  const 안 = 찾음.가장 ?? 찾음.가장멀리;
  const 보스 = m.웨이브.some((w) => w.보스);
  const 느린글 = 안.느려도이김 ? `손이 ${느린손배}배 느려도 이김` : `손이 ${느린손배}배 느리면 짐(여유 없음)`;
  줄글.push(
    `순서 ${찾음.전체}가지를 돌려 ${찾음.이긴수}가지 이김 — AI 가 적은 정책 ${m.정책들.length}개에서 시작해 규칙 자리 · 문턱 · 키우기 대상을 바꿔 가며 찾았다`,
    `${찾음.가장 === null ? '가장 멀리 간 순서' : '고른 순서'} — ${정책글(안.정책)}${찾음.가장 === null ? '' : ` · ${느린글}`}`,
    ...웨이브글(안.결과),
    `순서표(첫 웨이브 끝까지) — ${표글(순서표(안.결과))}`,
    ...(찾음.가장 === null ? [] : ['판은 조작 도우미가 이 순서대로 한다 — 판 함수는 손동작(상태 · 설치물 · 떨어진 · 걷기 · 놓기 · 키우기 · 먹이 · 줍기 …)만 돌려준다. 정책을 인자로 넘기지 않는다']),
  );
  const 낮은 = Math.min(...안.결과.웨이브.map((w) => w.끝지킬것));
  const 글 = 찾음.가장 === null ? `이기는 안 없음 — 가장 멀리 간 순서도 ${짐글(안.결과)}` : `이기는 안 있음 — ${m.웨이브.length}웨이브${보스 ? '와 보스' : ''}까지 · 가장 낮은 지킬것 ${낮은} · ${느린글}(${찾음.이긴수}/${찾음.전체} 이김)`;
  return {
    글: 재현 === undefined ? 글 : `${글} · 재현 ${재현.기록} ${재현.이김 ? '이김' : `${재현.짐?.웨이브 ?? '?'} 에서 짐`}${재현.맞음 === undefined ? '' : 재현.맞음 ? ' · 판과 맞음' : ` · 판과 어긋남(${재현.어긋남!.초}초 ${재현.어긋남!.값})`}`,
    줄글,
    결과: { 계산: '시뮬', 이김: 찾음.가장 !== null, 정책: 안.정책, 문턱: 안.문턱, 느려도이김: 안.느려도이김, 버금: 찾음.버금.filter((x) => x.결과.이김).map((x) => x.정책), 이긴수: 찾음.이긴수, 전체: 찾음.전체, 웨이브: 안.결과.웨이브, ...(안.결과.짐 === undefined ? {} : { 짐: 안.결과.짐 }), 손: { ...잰, 행동초: m.손.행동초 }, ...(뺌.뺀 === 0 ? {} : { 자리후보: m.자리후보 }), ...(재현 === undefined ? {} : { 재현 }), ...(맞춤 === undefined ? {} : { 맞춘값: 맞춤.값, 맞추기: { 판: 맞춤.판, 처음오차: 맞춤.처음오차, 끝오차: 맞춤.끝오차, 빠짐: 맞춤.빠짐 } }) },
    입력요약: { 파일, 해시: 해시(파일글), 엔진판, 웨이브수: m.웨이브.length, 보스, 볼값연결: m.볼값연결, ...(세계 === undefined ? {} : { 세계 }), ...(뺌.뺀 === 0 ? {} : { 못심음뺀: 뺌.뺀 }) },
  };
}
