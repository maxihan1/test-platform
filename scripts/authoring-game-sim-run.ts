// 시뮬레이션 돌리기 — 손 시간 · 걷는 속도는 판 기록에서 재고, 걷는 거리는 격자 길찾기로 내고, 순서 찾기(kit gameplay)가 고른 순서를 줄로 낸다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 계산기(authoring-game-calc.ts 의 `시뮬`) · 게이트(authoring-learn-sim.ts)가 같이 쓴다. 엔진 · 순서 찾기 · 순서대로 하기는 케이스도 쓰게 `packages/kit/src/gameplay` 에 있다
import { createHash } from 'node:crypto';

import { 곳격자, 길내기, 맨쌍글 } from './authoring-game-path.js';
import { type 걷는거리, type 모델, type 시뮬결과, type 잰손, type 점, type 행동, 느린손배, 돌리기, 손넣기, 손셈, 순서표, 엔진판, 정책글, 찾기, 표글, 행동초첫값 } from '@platform/kit/gameplay';
import { type 지도줄, 지금지도 } from './authoring-game-find.js';
import { 게임자리 } from './authoring-game.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';
import { type 판기록, 판기록들 } from './authoring-learn-check.js';
import { 놀이시작뒤 } from './authoring-learn-io.js';
import { type 재현비교, 비교표글, 어긋남글, 재현비교하기, 판값들 } from './authoring-game-sim-compare.js';
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
    return [{ 초: x.초, 행동: x.행동, ...(typeof x.대상 === 'string' ? { 대상: x.대상 } : {}), ...(자 === undefined ? {} : { 자리: 자 }), ...(자들 === undefined ? {} : { 자리들: 자들 }), ...(수(x.시작초) ? { 시작초: x.시작초 } : {}), ...(수(x.도착초) ? { 도착초: x.도착초 } : {}), ...(수(x.끝초) ? { 끝초: x.끝초 } : {}), ...(typeof x.됨 === 'boolean' ? { 됨: x.됨 } : x.안됨 === true ? { 됨: false } : {}), ...(수(x.걸음) ? { 걸음: x.걸음 } : {}), ...(수(x.값) ? { 값: x.값 } : {}) }];
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

/** 그 판을 재현해(행동기록을 그 시각에 그대로) 판 값기록과 같은 시각끼리 견준다. 행동기록이 없으면 null · 볼값을 못 이으면 비교.본수 0 */
export function 판재현(m: 모델, 걷기: 걷는거리 | undefined, 기록들: readonly 판기록[], r: 판기록): { 결과: 시뮬결과; 행: 행동[]; 비교: 재현비교 } | null {
  const 행 = 판행동기록(기록들, r);
  if (행 === null || 행.length === 0) return null;
  const 결과 = 돌리기(m, [], 걷기, 행);
  const 조각들 = 판조각들(기록들, r).flatMap((x) => (x.값기록 === undefined ? [] : [{ 값기록: x.값기록, 따라감: x.따라감 }]));
  return { 결과, 행, 비교: 재현비교하기(판값들(조각들, m.볼값연결), 결과, m.볼값연결, 행, m.지킬것.체력) };
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

/** 격자 길찾기로 걷는 거리 — 칸 쌍마다 한 번만 찾는다. 격자를 못 지으면 곧은 거리 */
export function 격자걷기(자료: string, m: 모델): { 걷기: 걷는거리; 글: string } {
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
        d = '길이' in r ? r.길이 : 곧은(a, b) * 3;
        표.set(열쇠, d);
      }
      return d;
    },
  };
}

/** 측정 값을 담지 않는 줄 종류 — 유지 근거로 받지 않는다(곳 · 계획 · 회고 · 물음 · 목표 · 계산 줄을 적어 근거를 채우지 못하게) */
const 빌드머리 = '빌드 데이터:';
const 근거아닌종류 = new Set(['STAGE', 'TRIAL', 'PLAY', 'ASK', 'GOAL', 'CALC', 'KIND']);
export const 빌드글 = (자료: string): string | null => 안전히읽기(자료, 게임자리.빌드데이터, 200_000_000);

/**
 * 유지 · 설치물둘레 값이 잰 값인지 — 근거가 측정 줄(규칙 · 시간 · 값 줄 따위)의 지도 열쇠이거나 `빌드 데이터:<타입 이름>`(빌드 데이터에 그 이름이 있다)이어야 한다.
 * 16102 는 지침 본보기 숫자를 베끼고 마지막 레벨 유지없음을 빠뜨려 깬 맵까지 이기는 안이 없다고 냈다. 지도 열쇠 근거는 지도를 못 읽으면 못 봐 안 받는다
 */
export function 근거틀림(m: 모델, 줄들: readonly Pick<지도줄, 'kind' | 'key' | 'learned'>[] | null, 빌드: string | null): string | null {
  const 근거들 = [...Object.values(m.설치물종류).flatMap((t) => (t.유지 === undefined ? [] : [t.유지.근거])), ...(m.설치물둘레 === undefined ? [] : [m.설치물둘레.근거])];
  const 틀린 = 근거들.filter((k) => {
    if (k.startsWith(빌드머리)) {
      const 이름 = k.slice(빌드머리.length).trim();
      return 빌드 === null || 이름 === '' || !빌드.includes(이름);
    }
    const 줄 = 줄들?.find((x) => x.key === k && x.learned !== null);
    return 줄 === undefined || 근거아닌종류.has(줄.kind);
  });
  if (틀린.length === 0) return null;
  if (줄들 === null && 틀린.some((k) => !k.startsWith(빌드머리))) return `지도를 못 읽어 유지 · 설치물둘레 근거 ${틀린.join(' · ')} 를 못 봤다 — 자료 폴더의 game-calc 안에서 다시 계산한다`;
  return `유지 · 설치물둘레 근거 ${틀린.join(' · ')} 가 잰 값의 출처가 아니다 — 판 · 지도에서 잰 값이면 그 측정 줄(규칙 · 시간 · 값 줄) 열쇠, 빌드 데이터면 「빌드 데이터:<타입 이름>」을 적는다(곳 · 계획 · 계산 줄은 안 받는다 · 지침 본보기 숫자를 쓰지 않는다)`;
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
export function 시뮬계산(모델: 모델, 자료: string | undefined, 파일글: string, 파일: string): { 글: string; 줄글: string[]; 결과: Record<string, unknown>; 입력요약: Record<string, unknown> } | { 틀림: string } {
  if (자료 !== undefined) {
    const 틀 = 근거틀림(모델, 지금지도(자료)?.줄들 ?? null, 빌드글(자료));
    if (틀 !== null) return { 틀림: 틀 };
  }
  const 잰: 잰손 = 자료 === undefined ? { 행동초: 행동초첫값 } : 손재기(자료, 모델.곳);
  const m = 손넣기(모델, 잰);
  const 걸음 = 자료 === undefined ? { 걷기: undefined, 글: '자료 폴더 밖 입력이라 곧은 거리로 걸었다' } : 격자걷기(자료, m);
  let 재현: { 기록: string; 이김: boolean; 웨이브수: number; 짐?: 시뮬결과['짐']; 맞음?: boolean; 어긋남?: 재현비교['어긋남'] } | undefined;
  const 줄글: string[] = [...(자료 === undefined ? ['이 입력은 <자료 폴더>/game-calc/ 밖에 있다 — 이 줄로는 판이 안 돈다(조작 도우미가 그 자리에서 입력을 다시 읽는다). 입력을 그 폴더로 옮겨 다시 계산한다'] : []), `손 — ${손글({ ...잰, 행동초: m.손.행동초 })} · ${걸음.글}`];
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
    결과: { 계산: '시뮬', 이김: 찾음.가장 !== null, 정책: 안.정책, 문턱: 안.문턱, 느려도이김: 안.느려도이김, 버금: 찾음.버금.filter((x) => x.결과.이김).map((x) => x.정책), 이긴수: 찾음.이긴수, 전체: 찾음.전체, 웨이브: 안.결과.웨이브, ...(안.결과.짐 === undefined ? {} : { 짐: 안.결과.짐 }), 손: { ...잰, 행동초: m.손.행동초 }, ...(재현 === undefined ? {} : { 재현 }) },
    입력요약: { 파일, 해시: 해시(파일글), 엔진판, 웨이브수: m.웨이브.length, 보스, 볼값연결: m.볼값연결 },
  };
}
