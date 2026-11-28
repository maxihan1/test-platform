// 숫자 맞추기 — 시뮬 입력의 맞추기에 적은 못 잰 값을, 그 곳 판 기록들을 재현했을 때 판과의 오차가 가장 작아지게 기계가 찾는다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 2026-11-28 사용자 「숫자는 기계가 맞추기」 — AI 가 짐작으로 다른 숫자를 비틀어 맞추면(16102 유지 값) 또 어긋났다. 잰 값은 고정하고 못 잰 값만, 판 여럿에 같이 맞춘다
import { type 걷는거리, type 모델, type 행동, 돌리기, 입력읽기, 손넣기, type 잰손 } from '@platform/kit/gameplay';

import { type 판값, 재현오차 } from './authoring-game-sim-compare.js';

/** 배율 — 그 경로의 값마다 같은 배율을 곱한다(경로에 * 를 쓸 때) */
export interface 맞출값 { 경로: string; 하한: number; 상한: number; 배율: boolean }
/** 맞출 판 — 판 기록 하나(이어 부른 판은 앞 조각까지)를 재현에 쓸 꼴로 */
export interface 맞출판 { 이름: string; 판: 판값[]; 행: 행동[] }
export interface 맞춘결과 { 값: Record<string, number>; 처음값: Record<string, number>; 처음오차: number; 끝오차: number; 판: string[]; 판마다: Record<string, Record<string, number>>; 빠짐: string[]; 돌림: number }

/** 맞출 때 쓰는 그 곳의 가장 새 판 수(첫 값) — 판이 수십이면 한 번 견주는 데 시뮬을 수십 번 돌려 찾기가 몇 바퀴 못 돈다 */
export const 맞출판수 = 5;
/** 시뮬을 이만큼 돌리면 그만 찾는다(첫 값 — 판 셋 · 값 넷이면 다 돈다) */
export const 맞추기상한 = 1500;
/** 판마다 따로 맞춘 값이 범위의 이 비율보다 넓게 갈리면 숫자가 아니라 규칙이 빠진 것으로 본다(첫 값) */
export const 갈림비율 = 0.3;
const 칸수 = 9;
const 바퀴 = 3;
/** 재현은 판의 시각을 그대로 따라 해 손 시간 · 걷는 속도는 결과를 안 바꾼다 — 판 기록에서 잰다(손셈) */
const 못맞춤 = /^(손(\.|$)|캐릭터\.걷기속도$)/;

const 객체인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const 둥 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * 경로가 가리키는 숫자 칸들 — 입력 JSON 그대로 걷는다. 목록(적종류 · 설치물종류 · 아이템 · 회복)은 이름으로 고르고, 수는 차례, * 는 전부다.
 * 입력 JSON 에 바로 넣어 고치니 게이트 · 케이스 순서자료가 같은 입력 읽기를 그대로 탄다
 */
export function 값칸들(입력: unknown, 경로: string): { 곳: Record<string, unknown> | unknown[]; 키: string | number }[] {
  let 들: unknown[] = [입력];
  const 칸들 = 경로.split('.');
  for (const [i, 칸] of 칸들.entries()) {
    const 다음 = (x: unknown): { 곳: Record<string, unknown> | unknown[]; 키: string | number }[] => {
      if (Array.isArray(x)) {
        if (/^\d+$/.test(칸)) return [{ 곳: x, 키: Number(칸) }];
        return x.flatMap((y, j) => (칸 === '*' || (객체인가(y) && y.이름 === 칸) ? [{ 곳: x, 키: j }] : []));
      }
      if (!객체인가(x)) return [];
      return 칸 === '*' ? Object.keys(x).map((k) => ({ 곳: x, 키: k })) : 칸 in x ? [{ 곳: x, 키: 칸 }] : [];
    };
    const 자리들 = 들.flatMap(다음);
    if (i === 칸들.length - 1) return 자리들.filter((z) => typeof (z.곳 as Record<string | number, unknown>)[z.키] === 'number');
    들 = 자리들.map((z) => (z.곳 as Record<string | number, unknown>)[z.키]);
  }
  return [];
}

/** 입력의 맞추기 — { "<경로>": [하한, 상한] | { 배율: [하한, 상한] } }. 없으면 빈 목록, 틀리면 무엇이 틀렸나 */
export function 맞출값읽기(입력: Record<string, unknown>): 맞출값[] | { 틀림: string } {
  const v = 입력.맞추기;
  if (v === undefined) return [];
  if (!객체인가(v)) return { 틀림: '맞추기 는 { "<경로>": [하한, 상한] | { "배율": [하한, 상한] } } 이다(예: "적종류.악마.체력": [100, 600] · "적종류.*.체력": { "배율": [0.5, 2] })' };
  const 들: 맞출값[] = [];
  for (const [경로, 범] of Object.entries(v)) {
    const 배율 = 객체인가(범) && Array.isArray(범.배율);
    const 둘 = 배율 ? (범 as { 배율: unknown[] }).배율 : 범;
    if (!Array.isArray(둘) || 둘.length !== 2 || !둘.every((n) => typeof n === 'number' && Number.isFinite(n)) || (둘[0] as number) >= (둘[1] as number)) return { 틀림: `맞추기.${경로} 는 [하한, 상한](하한 < 상한)이나 { "배율": [하한, 상한] } 이다` };
    if (못맞춤.test(경로)) return { 틀림: `맞추기.${경로} — 손 시간 · 걷는 속도는 재현이 판 시각을 그대로 따라 해 맞출 수 없다(판 기록에서 잰다)` };
    if (경로.includes('*') && !배율) return { 틀림: `맞추기.${경로} — * 는 그 칸마다 같은 배율을 곱할 때만 쓴다({ "배율": [하한, 상한] })` };
    if (값칸들(입력, 경로).length === 0) return { 틀림: `맞추기.${경로} 가 입력의 숫자 칸이 아니다(예: 적종류.악마.체력 · 재화.줍는거리 · 설치물종류.쌍둥이.레벨.0.공격력 · 적종류.*.체력)` };
    들.push({ 경로, 하한: 둘[0] as number, 상한: 둘[1] as number, 배율 });
  }
  return 들;
}

/** 맞춘 값을 넣은 입력 JSON — 원본은 안 고친다. 배율은 원본 값에 곱한다 */
export function 맞춘입력(입력: Record<string, unknown>, 맞출들: readonly 맞출값[], 값: Readonly<Record<string, number>>): Record<string, unknown> {
  const 새 = structuredClone(입력);
  for (const x of 맞출들) {
    const v = 값[x.경로];
    if (v === undefined) continue;
    for (const z of 값칸들(새, x.경로)) {
      const 곳 = z.곳 as Record<string | number, number>;
      곳[z.키] = x.배율 ? 곳[z.키]! * v : v;
    }
  }
  return 새;
}

/** CALC 줄의 맞춘값을 입력에 넣는다 — 입력 맞추기에 있는 경로이고 범위 안이어야 한다(줄 글자를 고쳐 아무 값이나 넣지 못하게). 틀리면 까닭 */
export function 줄맞춘입력(입력: Record<string, unknown>, 맞춘값: unknown): { 입력: Record<string, unknown> } | { 틀림: string } {
  if (맞춘값 === undefined) return { 입력 };
  const 맞출들 = 맞출값읽기(입력);
  if ('틀림' in 맞출들) return 맞출들;
  if (!객체인가(맞춘값)) return { 틀림: '결과.맞춘값 이 { 경로: 수 } 가 아니다 — 다시 계산해 찍힌 줄을 그대로 적는다' };
  for (const [경로, v] of Object.entries(맞춘값)) {
    const x = 맞출들.find((y) => y.경로 === 경로);
    if (x === undefined || typeof v !== 'number' || v < x.하한 || v > x.상한) return { 틀림: `결과.맞춘값.${경로} ${String(v)} 이 입력 맞추기 범위 밖이다 — 다시 계산해 찍힌 줄을 그대로 적는다` };
  }
  return { 입력: 맞춘입력(입력, 맞출들, 맞춘값 as Record<string, number>) };
}

const 칸값들 = (하: number, 상: number): number[] => Array.from({ length: 칸수 }, (_, i) => 둥(하 + ((상 - 하) * i) / (칸수 - 1)));

/**
 * 판들을 재현해 오차 합이 가장 작은 값 — 값마다 범위를 아홉 칸으로 나눠 하나씩 바꿔 보고(다른 값은 그대로), 고른 칸 둘레로 좁혀 세 바퀴 돈다. 같은 입력이면 늘 같은 답이다.
 * 판이 둘 이상이면 판마다 따로도 맞춰 보고, 판마다 맞는 값이 범위의 갈림비율보다 넓게 갈리면 빠짐에 넣는다 — 숫자 하나로는 판 여럿을 못 맞추니 규칙이 빠졌다(다른 숫자 조합이 우연히 맞는 것도 판 여럿으로 막는다)
 */
export function 숫자맞추기(입력: Record<string, unknown>, 맞출들: readonly 맞출값[], 판들: readonly 맞출판[], 잰: Omit<잰손, '기록'>, 걷기?: 걷는거리): 맞춘결과 {
  const 처음값 = Object.fromEntries(맞출들.map((x) => {
    const 지금 = x.배율 ? 1 : ((값칸들(입력, x.경로)[0]!.곳 as Record<string | number, number>)[값칸들(입력, x.경로)[0]!.키] ?? x.하한);
    return [x.경로, Math.min(x.상한, Math.max(x.하한, 지금))];
  }));
  let 돌림 = 0;
  const 오차 = (값: Record<string, number>, 대상: readonly 맞출판[]): number => {
    const m = 입력읽기(맞춘입력(입력, 맞출들, 값));
    if ('틀림' in m) return Infinity;
    const mm: 모델 = 손넣기(m, 잰);
    돌림 += 대상.length;
    return 대상.reduce((s, p) => s + 재현오차(p.판, 돌리기(mm, [], 걷기, p.행), mm.볼값연결, mm.지킬것.체력), 0);
  };
  const 처음오차 = 판들.length === 0 ? 0 : 오차(처음값, 판들);
  if (판들.length === 0 || 맞출들.length === 0) return { 값: 처음값, 처음값, 처음오차, 끝오차: 처음오차, 판: 판들.map((p) => p.이름), 판마다: {}, 빠짐: [], 돌림 };
  const 값 = { ...처음값 };
  let 지금오차 = 처음오차;
  const 폭 = Object.fromEntries(맞출들.map((x) => [x.경로, [x.하한, x.상한] as [number, number]]));
  for (let b = 0; b < 바퀴 && 돌림 < 맞추기상한; b += 1) {
    for (const x of 맞출들) {
      const [하, 상] = 폭[x.경로]!;
      for (const v of 칸값들(하, 상)) {
        if (돌림 >= 맞추기상한) break;
        if (v === 값[x.경로]) continue;
        const e = 오차({ ...값, [x.경로]: v }, 판들);
        if (e < 지금오차) [값[x.경로], 지금오차] = [v, e];
      }
      const 한칸 = (상 - 하) / (칸수 - 1);
      폭[x.경로] = [Math.max(x.하한, 값[x.경로]! - 한칸), Math.min(x.상한, 값[x.경로]! + 한칸)];
    }
  }
  const 판마다: Record<string, Record<string, number>> = {};
  const 빠짐: string[] = [];
  if (판들.length >= 2) {
    for (const x of 맞출들) {
      판마다[x.경로] = Object.fromEntries(판들.map((p) => {
        let [고른, 고른오차] = [값[x.경로]!, Infinity];
        for (const v of 칸값들(x.하한, x.상한)) {
          const e = 오차({ ...값, [x.경로]: v }, [p]);
          if (e < 고른오차) [고른, 고른오차] = [v, e];
        }
        return [p.이름, 고른];
      }));
      const 들 = Object.values(판마다[x.경로]!);
      if (Math.max(...들) - Math.min(...들) > (x.상한 - x.하한) * 갈림비율) 빠짐.push(x.경로);
    }
  }
  return { 값, 처음값, 처음오차: 둥(처음오차), 끝오차: 둥(지금오차), 판: 판들.map((p) => p.이름), 판마다, 빠짐, 돌림 };
}

/** 사람이 읽는 줄 — 계산 출력에 찍는다 */
export function 맞춘글(맞출들: readonly 맞출값[], r: 맞춘결과): string[] {
  if (r.판.length === 0) return ['숫자 맞추기 — 그 곳 판 기록(행동기록 · 값기록이 있는 판)이 없어 입력 값 그대로 썼다'];
  const 값글 = 맞출들.map((x) => `${x.경로} ${x.배율 ? '×' : ''}${r.처음값[x.경로]} → ${x.배율 ? '×' : ''}${r.값[x.경로]}`).join(' · ');
  return [
    `숫자 맞추기 — 판 ${r.판.length}개(${r.판.join(' · ')})로 맞춤 · 오차 ${r.처음오차} → ${r.끝오차}(1 아래면 대체로 허용 안) · ${값글} · 시뮬 ${r.돌림}번`,
    ...r.빠짐.map((k) => `  ${k} — 판마다 맞는 값이 크게 다르다(${Object.entries(r.판마다[k] ?? {}).map(([p, v]) => `${p} ${v}`).join(' · ')}). 숫자 하나로는 판 여럿을 못 맞춘다 — 숫자가 아니라 규칙이 빠졌다(게임 세계 코드에 그 규칙을 넣는다)`),
  ];
}
