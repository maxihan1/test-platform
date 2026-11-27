// 게임플레이 진행 조건 — 시뮬레이션으로 끝 웨이브 · 보스까지 이기는 안이 있어야 판을 돌고, 판이 시뮬과 어긋나면 그 판을 재현해야 다음 판이 돈다 (도메인/게임 §3.10 「게임플레이」)
// 2026-11-28 사용자 「확실히 시뮬레이션 하고 스테이지를 돌자」 — 판에서 알아낸 값이 빌드 데이터에 처음부터 있었는데 판을 수십 번 돌았다(작성 16094 · 16097 · 16098)
// 게이트는 AI 가 적은 줄 글자를 믿지 않는다. 입력 파일 해시 · 엔진판을 보고 고른 정책으로 다시 돌려 이김을 확인한다
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 지도줄 } from './authoring-game-find.js';
import type { 모델 } from './authoring-game-sim-input.js';
import { 문턱넣기, 입력읽기 } from './authoring-game-sim-input.js';
import { 격자걷기, 손재기, 해시, 행동기록읽기 } from './authoring-game-sim-run.js';
import { 돌리기, 엔진판 } from './authoring-game-sim.js';
import { type 기대, type 볼값, type 값기록, type 판기록, 가장큰, 계산머리, 판기록들 } from './authoring-learn-check.js';
import { 계획곳, 곳셈, 곳줄들, 못닿고짐, 시뮬불가읽기 } from './authoring-learn-play.js';

/** 기계가 넣는 기대 — 웨이브마다 시뮬 예측 지킬것의 이 비율 아래로 내려가면 판이 시뮬과 어긋난 것이다(첫 값) */
export const 기대여유 = 0.8;
/** 재현이 판과 맞았다고 보는 웨이브 차이(첫 값) */
export const 재현웨이브차 = 1;

type 줄 = Pick<지도줄, 'kind' | 'key' | 'learned'>;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 칸 = (x: 줄 | undefined): Record<string, unknown> => 객체(x?.learned?.data);
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

interface 시뮬줄 {
  열쇠: string;
  곳: string;
  결과: { 이김: boolean; 정책: unknown[]; 정책번호: number; 문턱: Record<string, number>; 손: { 행동초: number; 기록?: string } };
  입력: { 파일: string; 해시: string; 엔진판: number; 웨이브수: number; 보스: boolean; 볼값연결: { 웨이브?: string; 지킬것?: string } };
}

/** 계산기 `시뮬` 이 낸 CALC 줄이면 읽은 것, 아니면 null */
export function 시뮬줄읽기(x: 줄 | undefined): 시뮬줄 | null {
  const d = 칸(x);
  const 결 = 객체(d.결과);
  const 입 = 객체(d.입력);
  if (x?.kind !== 'CALC' || 결.계산 !== '시뮬' || !글인가(d.곳) || !Array.isArray(결.정책) || !글인가(입.파일) || !글인가(입.해시)) return null;
  return { 열쇠: x.key, 곳: d.곳, 결과: 결 as unknown as 시뮬줄['결과'], 입력: 입 as unknown as 시뮬줄['입력'] };
}

/** 그 곳에 시뮬이 필요한가 — 맵 적 을 없음으로 적은 곳(메뉴 · 적이 안 오는 곳)은 아니다 */
export const 시뮬필요 = (곳줄: 줄 | undefined): boolean => !글인가(객체(객체(칸(곳줄).맵).적).없음);

/** 끝 웨이브 · 보스까지 넣었나 — STAGE data.끝웨이브.수 가 있으면 그만큼, 없으면 보스 웨이브가 있어야 한다 */
function 끝까지(곳줄: 줄 | undefined, s: Pick<시뮬줄, '입력' | '열쇠'>): string | null {
  const 끝 = 객체(칸(곳줄).끝웨이브).수;
  if (typeof 끝 === 'number') return s.입력.웨이브수 >= 끝 ? null : `${s.열쇠} 는 ${s.입력.웨이브수}웨이브까지만 넣었다 — 그 곳 끝웨이브 ${끝} 까지 다 넣는다`;
  return s.입력.보스 ? null : `${s.열쇠} 에 보스 웨이브(보스: true)가 없다 — 끝 웨이브 · 보스까지 넣거나, 보스가 없는 곳이면 그 STAGE data.끝웨이브 { 수, 출처 } 를 빌드 데이터에서 읽어 적는다`;
}

/** 이 곳을 계획으로 해 본 가장 새 판(멈춤 · 치트 조각 빼고) */
/** 볼값 가운데 하나라도 처음 읽은 값에서 바뀌었나 — 안 바뀌었으면 판이 흐르지 않았다 */
function 값움직임(기: 값기록): boolean {
  const 처음: Record<string, number> = {};
  for (const t of 기.때) {
    for (const [k, v] of Object.entries(t.값)) {
      if (v === null) continue;
      if (k in 처음 && 처음[k] !== v) return true;
      처음[k] ??= v;
    }
  }
  return false;
}

/**
 * 이 곳을 계획으로 해 본 가장 새 판(멈춤 · 치트 조각 빼고). 판에 못 들어간 부르기(행동기록이 비고 볼값이 한 번도 안 바뀜)는 건너뛴다 —
 * 메뉴에서 못 들어간 판이 마지막 판이 되어 「행동기록을 안 돌려줬다」로 그 곳의 다음 판을 다 막았다(16100 첫 맵 · 둘째 맵)
 */
const 마지막판 = (줄들: readonly 줄[], 기록들: readonly 판기록[], 곳: string): 판기록 | undefined =>
  [...기록들].reverse().find((r) => r.값기록 !== undefined && r.멈춤 === undefined && r.치트 !== true && 계획곳(줄들, r.값기록.계획) === 곳 && ((행동기록읽기(r)?.length ?? 0) > 0 || 값움직임(r.값기록)));

/** 이 곳을 판에서 깬 수 — 놀이시작과 상관없이 모든 판 기록에서 센다 */
const 깬판수 = (줄들: readonly 줄[], 자료: string, 곳: string): number => 곳셈(줄들, 판기록들(자료)).find((x) => x.열쇠 === 곳)?.깸 ?? 0;

/**
 * 게임플레이 계획을 돌리기 전에 본다 — 막을 까닭 글, 통과면 계획에 더할 기대, 시뮬이 필요 없는 곳이면 null.
 * 인자는 판 함수에 넘길 인자 배열 — 시뮬이 고른 정책(그대로 · 또는 { 정책 } 안에)이 있어야 시뮬에서 이긴 판단과 판에서 한 판단이 같다
 */
export function 시뮬막기(계획: { 곳?: string; 쓸것?: readonly string[]; 볼값: readonly 볼값[] }, 줄들: readonly 줄[], 자료: string, 기록들: readonly 판기록[], 인자: readonly unknown[]): { 막음: string } | { 기대: 기대[] } | null {
  if (계획.곳 === undefined) return null;
  const 곳 = 계획.곳;
  const 곳줄 = 곳줄들(줄들).find((x) => x.key === 곳);
  if (!시뮬필요(곳줄)) return null;
  const s = (계획.쓸것 ?? []).filter((k) => k.startsWith(계산머리)).map((k) => 시뮬줄읽기(줄들.find((x) => x.key === k && x.learned !== null))).find((x): x is 시뮬줄 => x !== null && x.곳 === 곳);
  if (s === undefined) return { 막음: `${곳} 은 판을 돌기 전에 시뮬레이션으로 이기는 안이 있어야 한다 — 빌드 데이터 · 맵으로 입력(계산: 시뮬)을 \`${자료}/game-calc/<이름>.json\` 에 쓰고 \`npx tsx scripts/authoring-game-calc.ts <파일>\` 로 돌려 찍힌 CALC 줄(data.곳 이 이 곳)을 적고 계획 data.쓸것 에 넣는다. 정책 · 문턱 후보를 바꿔도 이기는 안이 없으면 그 STAGE 에 data.시뮬불가 를 적고 다음 맵으로 간다` };
  if (!s.결과.이김) {
    const 깬 = 깬판수(줄들, 자료, 곳);
    if (깬 > 0) return { 막음: `${s.열쇠} 는 이기는 안이 없다고 나왔는데 ${곳} 은 판에서 ${깬}판 깬 적이 있다 — 계산 값이 실제보다 비관적이다. 유지 · 끝초당피해 · 체력 · 출현 값을 판 · 지도 규칙에서 다시 재서 입력을 고친다(시뮬불가로 닫지 않는다)` };
    return { 막음: `${s.열쇠} 는 이기는 안이 없다고 나왔다 — 정책 · 문턱 후보를 바꿔 다시 돌리거나, 그래도 없으면 ${곳} 에 data.시뮬불가 { 계산: ${s.열쇠}, 웨이브, 모자람 } 을 적고 다음 맵으로 간다` };
  }
  let 글: string;
  try {
    글 = readFileSync(join(자료, s.입력.파일), 'utf8');
  } catch {
    return { 막음: `${s.열쇠} 의 입력 파일 ${s.입력.파일} 을 못 읽었다 — 입력은 ${자료}/game-calc/<이름>.json 에 두고 그 파일로 다시 계산해 줄을 고친다` };
  }
  if (해시(글) !== s.입력.해시) return { 막음: `${s.열쇠} 를 낸 뒤 입력 파일 ${s.입력.파일} 이 바뀌었다 — 다시 계산해 찍힌 줄로 고친다` };
  if (s.입력.엔진판 !== 엔진판) return { 막음: `${s.열쇠} 는 다른 엔진판(${s.입력.엔진판} · 지금 ${엔진판})으로 냈다 — 다시 계산한다` };
  const 끝 = 끝까지(곳줄, s);
  if (끝 !== null) return { 막음: 끝 };
  // 판을 하나 더 돌면 손 시간이 바뀐다 — 그 판으로 다시 시뮬해야 다음 판이 돈다
  const 잰 = 손재기(자료, 곳);
  if ((잰.기록 ?? null) !== (s.결과.손.기록 ?? null)) return { 막음: `${s.열쇠} 는 판 ${잰.기록 ?? '없음'} 을 돈 뒤 다시 안 돌렸다(그 판의 손 시간이 안 들어갔다) — 같은 입력으로 다시 계산해 줄을 고친다` };
  const m = 입력읽기(객체(JSON.parse(글)));
  if ('틀림' in m) return { 막음: `${s.열쇠} 의 입력이 틀렸다 — ${m.틀림}` };
  // 줄 글자는 믿지 않는다 — 손 시간은 파일 값과 잰 값 가운데 느린 쪽, 정책은 파일의 후보와 문턱 후보로 다시 만든다
  const 손: 모델['손'] = { 행동초: Math.max(m.손.행동초, 잰.행동초) };
  const 걷기 = 격자걷기(자료, m).걷기;
  const 후보 = m.정책들[s.결과.정책번호];
  const 문턱맞음 = Object.entries(s.결과.문턱 ?? {}).every(([k, v]) => m.문턱후보[k]?.includes(v) === true) && Object.keys(m.문턱후보).every((k) => s.결과.문턱?.[k] !== undefined);
  const 정책 = 후보 === undefined || !문턱맞음 ? null : 문턱넣기(후보, s.결과.문턱);
  if (정책 === null || JSON.stringify(정책) !== JSON.stringify(s.결과.정책)) return { 막음: `${s.열쇠} 의 정책이 입력 파일의 정책 후보 · 문턱 후보로 만든 것이 아니다 — 다시 계산해 찍힌 줄을 그대로 적는다` };
  // 판이 시뮬과 어긋났으면 그 판을 재현해야 한다 — 시뮬이 그 판을 못 맞추면 무엇을 잘못 읽었는지 아직 모른다
  const 앞판 = 마지막판(줄들, 기록들, 곳);
  const 앞시뮬 = 앞판 === undefined ? false : Object.values(앞판.값기록!.계산 ?? {}).some((v) => v.includes('"계산":"시뮬"'));
  if (앞판 !== undefined && 앞시뮬) {
    const 행 = 행동기록읽기(앞판) ?? [];
    if (행.length === 0) return { 막음: `판 ${앞판.이름} 의 판 함수가 행동기록을 안 돌려줬다 — 판 함수 결과에 행동기록 [{ 초, 행동, 대상?, 자리?, 도착초?, 끝초? }] 을 넣는다(시뮬과 비교하고 재현하는 데 쓴다)` };
    const 어긋 = 앞판.값기록!.어긋남 !== null || 못닿고짐(앞판, 줄들) !== null;
    const 웨 = s.입력.볼값연결.웨이브;
    if (어긋 && 웨 !== undefined) {
      const 판웨이브 = 가장큰(앞판.값기록!, 웨);
      if (m.재현?.기록 !== 앞판.이름) return { 막음: `판 ${앞판.이름} 이 시뮬과 어긋났다(${앞판.값기록!.어긋남?.기대 ?? '목표에 못 닿고 짐'}) — 시뮬 입력에 재현: { 기록: "${앞판.이름}" } 을 넣고 다시 돌려, 그 판 행동기록대로 하면 시뮬도 ${판웨이브 ?? '?'}웨이브까지 가는지 맞춘다. 행동이 같은데 값이 다르면 데이터를 잘못 읽은 것이고, 행동이 시뮬 정책과 다르면 판 함수를 고친다` };
      const 재 = 돌리기({ ...m, 손 }, [], 걷기, 행);
      const 재웨이브 = 재.이김 ? m.웨이브.length : 재.웨이브.length + 1;
      if (판웨이브 !== null && Math.abs(재웨이브 - 판웨이브) > 재현웨이브차) return { 막음: `시뮬이 판 ${앞판.이름} 을 못 맞춘다 — 판은 ${판웨이브}웨이브 · 재현은 ${재.이김 ? '끝까지 이김' : `${재웨이브}웨이브에서 짐`}. 어느 값이 판과 다른지(출현 수 · 간격 · 체력 · 사거리 · 손 시간) 찾아 입력을 고친다` };
    }
  }
  if (!인자.some((a) => JSON.stringify(a) === JSON.stringify(정책) || JSON.stringify(객체(a).정책) === JSON.stringify(정책))) return { 막음: `판 함수 인자에 ${s.열쇠} 가 고른 정책이 없다 — 계산기가 찍은 「판 함수 인자로 넘길 것」 JSON 을 그대로 인자로 넘기고, 판 함수는 그 규칙대로만 고른다` };
  const 다시 = 돌리기({ ...m, 손 }, 정책, 걷기);
  if (!다시.이김) return { 막음: `${s.열쇠} 를 다시 돌리니 이기지 못한다(격자 · 판 기록 · 손 시간이 바뀌었다) — 다시 계산한다` };
  // 기대는 기계가 만든다 — 웨이브마다 그 웨이브 동안 지킬것이 시뮬 예측의 기대여유 아래로 내려가면 어긋난 것이다
  const { 웨이브: 웨이브이름, 지킬것 } = s.입력.볼값연결;
  if (웨이브이름 === undefined || 지킬것 === undefined || !계획.볼값.some((b) => b.이름 === 웨이브이름) || !계획.볼값.some((b) => b.이름 === 지킬것)) return { 막음: `시뮬 입력 볼값연결 에 웨이브 · 지킬것 볼값 이름을 적고, 계획 data.볼값 에 같은 이름으로 그 값을 읽는다 — 판이 시뮬과 어긋난 순간을 기계가 잡는다` };
  return { 기대: 다시.웨이브.map((w, i) => ({ 값: 지킬것, 비교: '>=' as const, 기준: Math.round(w.끝지킬것 * 기대여유 * 10) / 10, 부터: { 값: 웨이브이름, 기준: i + 1 }, 까지: { 값: 웨이브이름, 기준: i + 1 } })) };
}

/** 적는 명령이 STAGE 를 받기 전에 본다 — 시뮬불가가 가리키는 줄이 그 곳의 진 시뮬 줄이고 끝 웨이브 · 보스까지 넣었나 · 끝웨이브 형태. 틀리면 까닭 글 */
/** 깬판수 — 그 곳을 판에서 깬 수. 깬 적이 있으면 시뮬불가가 아니라 계산 값이 틀린 것이다 */
export function 시뮬불가검사(열쇠: string, data: unknown, 찾기: (열쇠: string) => 줄 | undefined, 깬판수 = 0): string | null {
  const 끝 = 객체(data).끝웨이브;
  if (끝 !== undefined && !(typeof 객체(끝).수 === 'number' && 글인가(객체(끝).출처))) return 'data.끝웨이브 는 { 수, 출처 } 다 — 그 곳 끝 웨이브 수와 어디서 읽었나(빌드 데이터)';
  const 불가 = 시뮬불가읽기(data);
  if (불가 === null) return null;
  if (typeof 불가 === 'string') return 불가;
  const s = 시뮬줄읽기(찾기(불가.계산));
  if (s === null || s.곳 !== 열쇠) return `data.시뮬불가.계산 ${불가.계산} 이 이 곳(${열쇠})의 시뮬 CALC 줄이 아니다`;
  if (s.결과.이김) return `${불가.계산} 은 이기는 안이 있다고 나왔다 — 시뮬불가가 아니다`;
  if (깬판수 > 0) return `${열쇠} 는 판에서 ${깬판수}판 깬 적이 있다 — 계산 값이 실제보다 비관적이라 시뮬불가로 닫지 않는다. 유지 · 끝초당피해 · 체력 · 출현 값을 판 · 지도 규칙에서 다시 재서 입력을 고친다`;
  return 끝까지({ kind: 'STAGE', key: 열쇠, learned: { text: '', belief: 'GUESS', data } } as unknown as 줄, s);
}
