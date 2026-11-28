// 게임플레이 시뮬레이션 엔진 — 0.1초씩 흘리며 적 출현 · 걷기 · 설치물과 캐릭터의 공격 · 재화 흐름 · 캐릭터의 정책 판단을 센다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 웨이브 체력 합만 견주던 계산은 「버틴다」고 해 놓고 판은 1~2웨이브에서 졌다(작성 16094 · 16097 · 16098) — 출현 빠르기 · 걷는 시간 · 자라는 시간 · 줍는 시간을 다 넣는다
// 게임을 모른다. 같은 입력이면 늘 같은 결과라(무작위 없음) 게이트가 다시 돌려 확인한다
import { 거리, 길위자리, 누적길이, 원안길이 } from './simGeo.js';
import type { 모델, 규칙, 상태이름, 행동종류, 점 } from './simInput.js';

export { type 원, 원안길이 } from './simGeo.js';

export type { 점 } from './simInput.js';
/** 엔진이 바뀌면 올린다 — 게이트가 다른 엔진으로 낸 시뮬 줄을 다시 돌리게 */
export const 엔진판 = 5;
export const 칸초 = 0.1;
export const 예상간격초 = 2;
/** 이만큼 흘러도 안 끝나면 짐으로 끊는다 — 적이 기절만 되풀이하는 입력이 끝나지 않게 */
export const 최대초 = 3600;

/** 자리들 — 한 번에 주운 자리들(순서대로 하기가 이어진 줍기를 한 단계로 묶는다). 시작초 — 걷기 시작한 때(앞 행동이 끝난 뒤 읽고 고르는 데 든 시간이 초와 시작초 사이다). 걸음 — 그 행동을 하러 걸은 거리. 값 — 그 행동에 드는 재화(놓기 · 키우기 · 먹이) */
export interface 행동 { 초: number; 행동: string; 대상?: string; 자리?: 점; 자리들?: 점[]; 시작초?: number; 도착초?: number; 끝초?: number; 됨?: boolean; 걸음?: number; 값?: number }
export interface 웨이브결과 { 이름: string; 처치: number; 새어나감: number; 끝지킬것: number; 끝재화: number; 끝초: number }
export interface 시뮬결과 {
  이김: boolean;
  웨이브: 웨이브결과[];
  짐?: { 웨이브: string; 초: number; 새어나간체력: number; 쥔재화: number; 시간넘음?: true };
  예상: { 초: number; 값: Record<string, number> }[];
  행동기록: 행동[];
}
/** 놓인 설치물 둘레 못 놓는 반경 — 설치물이 있는 입력에는 늘 있다(입력읽기가 막는다). 0.5 는 설치물이 없는 입력의 자리값이다 */
export const 둘레반경 = (m: Pick<모델, '설치물둘레'>): number => m.설치물둘레?.반경 ?? 0.5;
/** 두 점 사이를 걷는 거리 — 시뮬을 부르는 쪽이 격자 길찾기로 준다. 없으면 곧은 거리 */
export type 걷는거리 = (a: 점, b: 점) => number;

/** 닿음 — 길 끝에 서서 지킬것을 깎는 중(끝초당피해가 있는 적) */
interface 적 { 종류: string; 체력: number; 길: readonly 점[]; 누적: number[]; 진행: number; 둔화: number; 배율: number; 기절: number; 웨이브: number; 쿨: number; 닿음: boolean }
/** 유지 — 남은 유지 체력(유지가 없으면 Infinity) */
interface 탑 { 종류: string; 레벨: number; 자리: 점; 자람: number; 쿨: number; 유지: number }
interface 할일 { 도착초: number; 끝초: number; 자리: 점; 기록: 행동; 효과: () => boolean }

const 자리 = (e: 적): 점 => 길위자리(e.길, e.누적, e.진행);
const 남은 = (e: 적): number => e.누적.at(-1)! - e.진행;
const 맞나 = (a: number, 비: string, b: number): boolean => (비 === '>=' ? a >= b : 비 === '<=' ? a <= b : 비 === '>' ? a > b : 비 === '<' ? a < b : a === b);

/**
 * 정책 하나로 한 판을 흘린다. 재현을 주면 정책 대신 그 행동기록을 그 시각에 그대로 한다(판이 시뮬과 어긋났을 때 그 판을 다시 맞춰 보는 데 쓴다)
 * ponytail: 캐릭터는 걷는 동안 자리가 안 바뀌고 도착 때 옮긴다 — 걷는 도중 줍기 · 맞기는 빠진다. 판과 어긋나면 그때 칸 단위로 옮긴다
 */
export function 돌리기(m: 모델, 정책: readonly 규칙[], 걷기: 걷는거리 = 거리, 재현?: readonly 행동[]): 시뮬결과 {
  const 적들: 적[] = [];
  const 탑들: 탑[] = [];
  /** 줍기만 — 판에서 읽은 바닥 재화. 캐릭터가 둘레에 서 있어도 판에서 안 주워진 채 있던 것이라 줍기 행동으로만 줍는다 */
  const 떨어진: { 자리: 점; 값: number; 줍기만?: true }[] = [];
  const 캐체력최대 = m.캐릭터.체력 ?? Infinity;
  const 시 = m.시작;
  let [재화, 지킬것, 캐자리, 캐체력, 쓰러짐, 캐쿨] = [시?.재화 ?? m.재화.시작, 시?.지킬것 ?? m.지킬것.체력, 시?.자리 ?? m.캐릭터.자리, 캐체력최대, 0, 0];
  let 할: 할일 | null = null;
  let 앞행동 = '';
  let 지금 = 0;
  const 쿨: Record<string, number> = {};
  const 남은개수: Record<string, number> = Object.fromEntries(Object.values(m.아이템).map((x) => [x.이름, x.개수 ?? Infinity]));
  const 결과웨이브: 웨이브결과[] = [];
  const 기록: 행동[] = [];
  const 예상: 시뮬결과['예상'] = [];
  const 셈 = m.웨이브.map(() => ({ 처치: 0, 새어나감: 0, 남은출현: 0, 새체력: 0 }));
  let 출현표: { 초: number; 웨이브: number; 종류: string; 길: string }[] = [];
  let 웨이브i = -1;
  let 다음시작 = 시?.첫웨이브까지초 ?? m.웨이브[0]!.시작초 ?? m.웨이브[0]!.쉬는초;
  const 재현남은 = 재현 === undefined ? null : [...재현].sort((a, b) => (a.끝초 ?? a.초) - (b.끝초 ?? b.초));

  const 덮음표 = new Map<string, number>();
  const 덮음 = (p: 점, 사거리: number): number => {
    const 열쇠 = `${p[0]},${p[1]},${사거리}`;
    const 앞 = 덮음표.get(열쇠);
    if (앞 !== undefined) return 앞;
    const v = Object.values(m.길).reduce((a, 길) => a + 원안길이(길, { 중심: p, 반지름: 사거리 }), 0);
    덮음표.set(열쇠, v);
    return v;
  };
  // 캐릭터가 죽인 적은 그 칸 끝 처치 단계까지 남아 있다 — 살아 있는 것만 센다
  const 산적 = (): 적[] => 적들.filter((e) => e.체력 > 0);
  const 둘레적 = (p: 점, r: number): 적[] => 산적().filter((e) => 거리(자리(e), p) <= r);
  const 상태 = (이름: 상태이름, 반경 = 0): number => {
    switch (이름) {
      case '지킬것체력': return 지킬것;
      case '지킬것비율': return 지킬것 / m.지킬것.체력;
      case '재화': return 재화;
      case '캐릭터체력비율': return Number.isFinite(캐체력최대) ? 캐체력 / 캐체력최대 : 1;
      case '웨이브': return 웨이브i + 1;
      case '지킬것둘레적수': return 둘레적(m.지킬것.자리, 반경).length;
      case '캐릭터둘레적수': return 둘레적(캐자리, 반경).length;
      case '캐릭터둘레재화수': return 떨어진.filter((d) => 거리(d.자리, 캐자리) <= 반경).length;
      case '지킬것가까운적거리': return Math.min(Infinity, ...산적().map((e) => 거리(자리(e), m.지킬것.자리)));
      case '유지최저비율': return Math.min(1, ...탑들.filter(유지받나).map((t) => t.유지 / m.설치물종류[t.종류]!.유지!.체력));
    }
  };
  const 맞기 = (e: 적, 피해: number, 둔화?: { 배율: number; 초: number }, 기절?: number): void => {
    e.체력 -= 피해;
    if (둔화 !== undefined) [e.둔화, e.배율] = [Math.max(e.둔화, 둔화.초), Math.min(e.배율 < 1 && e.둔화 > 0 ? e.배율 : 1, 둔화.배율)];
    if (기절 !== undefined) e.기절 = Math.max(e.기절, 기절);
  };
  /** 할 수 있으면 할 일 — 갈 자리 · 도착 뒤 효과. 못 하면 null */
  const 새탑 = (종류: string, 자: 점): 탑 => ({ 종류, 레벨: 0, 자리: 자, 자람: m.설치물종류[종류]!.자라는초, 쿨: 0, 유지: m.설치물종류[종류]!.유지?.체력 ?? Infinity });
  // 유지를 받는 탑 — 유지가 있고 지금 레벨이 유지없음이 아니다
  const 유지받나 = (t: 탑): boolean => m.설치물종류[t.종류]!.유지 !== undefined && m.설치물종류[t.종류]!.레벨[t.레벨]!.유지없음 !== true;
  // 이어 흘리기 — 판에 놓인 설치물은 다 자란 것으로, 바닥 재화는 값을 못 읽어 가장 싼 보상으로 친다
  const 싼보상 = Math.min(...Object.values(m.적종류).map((e) => e.보상).filter((v) => v > 0), Infinity);
  // 16104 둘째 맵은 고양이 옆 고기를 0초에 주운 셈이라 다시 계산마다 못 할 키우기를 또 냈다(41초 동안 28번 · 판에서는 고기가 그대로 있었다)
  for (const p of 시?.떨어진 ?? []) 떨어진.push({ 자리: p, 값: Number.isFinite(싼보상) ? 싼보상 : 1, 줍기만: true });
  const 주워담기 = (곳: 점, 다: boolean): void => { for (let i = 떨어진.length - 1; i >= 0; i -= 1) if ((다 || 떨어진[i]!.줍기만 !== true) && 거리(떨어진[i]!.자리, 곳) <= m.재화.줍는거리) 재화 += 떨어진.splice(i, 1)[0]!.값; };
  for (const s of 시?.설치물 ?? []) {
    const 종 = m.설치물종류[s.종류];
    if (종 !== undefined) 탑들.push({ ...새탑(종.이름, s.자리), 레벨: Math.min(종.레벨.length, Math.max(1, Math.round(s.레벨))) - 1, 자람: 0, 유지: 종.유지 === undefined ? Infinity : 종.유지.체력 * Math.min(1, Math.max(0, s.유지 ?? 1)) });
  }
  const 손초 = (무엇: string): number => m.손.종류별?.[무엇 as 행동종류] ?? m.손.행동초;
  const 계획 = (r: 규칙, t: number): Omit<할일, '도착초' | '끝초'> & { 가능초?: number; 손초?: number } | null => {
    const { 무엇, 대상, 반경 } = r.행동;
    const 기 = (자: 점): 행동 => ({ 초: t, 행동: 무엇, ...(대상 === undefined ? {} : { 대상 }), 자리: [Math.round(자[0] * 10) / 10, Math.round(자[1] * 10) / 10] });
    if (무엇 === '놓기') {
      const 종 = m.설치물종류[대상!]!;
      const 첫 = 종.레벨[0]!;
      if (재화 < 첫.값) return null;
      const 빈 = m.자리후보.filter((p) => !탑들.some((x) => 거리(x.자리, p) < 둘레반경(m)));
      // 같은 덮음이면 자리후보에 적은 차례 — 같은 입력이면 순서표의 놓기 자리가 늘 같다
      const 고른 = 빈.map((p) => ({ p, 덮: 덮음(p, 첫.사거리) })).sort((a, b) => b.덮 - a.덮)[0];
      if (고른 === undefined) return null;
      return { 자리: 고른.p, 기록: { ...기(고른.p), 값: 첫.값 }, 효과: () => (재화 >= 첫.값 ? ((재화 -= 첫.값), 탑들.push(새탑(종.이름, 고른.p)), true) : false) };
    }
    if (무엇 === '먹이') {
      const 먹 = m.설치물종류[대상!]!.유지!.먹이!;
      const 고른 = 탑들.filter((x) => x.종류 === 대상 && 유지받나(x) && x.유지 < m.설치물종류[x.종류]!.유지!.체력).sort((a, b) => a.유지 - b.유지 || 거리(a.자리, 캐자리) - 거리(b.자리, 캐자리))[0];
      if (고른 === undefined || 재화 < 먹.값) return null;
      return { 자리: 고른.자리, 기록: { ...기(고른.자리), 값: 먹.값 }, 손초: 먹.초, 효과: () => { if (재화 < 먹.값 || !탑들.includes(고른) || !유지받나(고른)) return false; 재화 -= 먹.값; 고른.유지 = Math.min(m.설치물종류[고른.종류]!.유지!.체력, 고른.유지 + 먹.양); return true; } };
    }
    if (무엇 === '키우기') {
      const 종 = m.설치물종류[대상!]!;
      const 먼저 = r.행동.고르기 === undefined ? 0 : r.행동.고르기 === '높은' ? -1 : 1;
      const 고른 = 탑들.filter((x) => x.종류 === 종.이름 && x.레벨 + 1 < 종.레벨.length && 종.레벨[x.레벨 + 1]!.값 <= 재화).sort((a, b) => 먼저 * (a.레벨 - b.레벨) || 덮음(b.자리, 종.레벨[b.레벨 + 1]!.사거리) - 덮음(a.자리, 종.레벨[a.레벨 + 1]!.사거리) || 거리(a.자리, 캐자리) - 거리(b.자리, 캐자리))[0];
      if (고른 === undefined) return null;
      return { 자리: 고른.자리, 기록: { ...기(고른.자리), 값: 종.레벨[고른.레벨 + 1]!.값 }, 효과: () => { const 값 = 종.레벨[고른.레벨 + 1]?.값; if (값 === undefined || 재화 < 값 || !탑들.includes(고른)) return false; 재화 -= 값; 고른.레벨 += 1; return true; } };
    }
    if (무엇 === '줍기') {
      const 고른 = 떨어진.filter((d) => 반경 === undefined || 거리(d.자리, 캐자리) <= 반경).sort((a, b) => 거리(a.자리, 캐자리) - 거리(b.자리, 캐자리))[0];
      if (고른 === undefined) return null;
      return { 자리: 고른.자리, 기록: 기(고른.자리), 효과: () => (주워담기(캐자리, true), true) };
    }
    if (무엇 === '이동') {
      const 곳 = r.행동.자리 ?? m.지킬것.자리;
      return 거리(곳, 캐자리) < 0.5 ? null : { 자리: 곳, 기록: 기(곳), 효과: () => true };
    }
    if (무엇 === '회복') {
      const 수단 = m.회복[대상!]!;
      const 가득 = 수단.대상 === '캐릭터' ? 캐체력 >= 캐체력최대 : 지킬것 >= m.지킬것.체력;
      if (가득 || 재화 < 수단.값 || (쿨[수단.이름] ?? 0) > t) return null;
      return { 자리: 캐자리, 기록: 기(캐자리), 효과: () => { if (재화 < 수단.값) return false; 재화 -= 수단.값; 쿨[수단.이름] = t + 수단.쿨타임; if (수단.대상 === '캐릭터') 캐체력 = Math.min(캐체력최대, 캐체력 + 수단.양); else 지킬것 = Math.min(m.지킬것.체력, 지킬것 + 수단.양); return true; } };
    }
    // 공격 · 아이템 — 반경을 주면 지킬것 둘레 그 안의 적만, 아니면 아무 적 가운데 길 끝에 가장 가까운 것
    const 후보 = (반경 === undefined ? 산적() : 둘레적(m.지킬것.자리, 반경)).sort((a, b) => 남은(a) - 남은(b))[0];
    if (후보 === undefined) return null;
    const 사거리 = 무엇 === '공격' ? m.캐릭터.공격!.사거리 : m.아이템[대상!]!.사거리;
    if (무엇 === '아이템' && ((쿨[대상!] ?? 0) > t || 남은개수[대상!]! <= 0)) return null;
    const 적자리 = 자리(후보);
    const d = 거리(캐자리, 적자리);
    const 설자리: 점 = d <= 사거리 ? 캐자리 : [적자리[0] + ((캐자리[0] - 적자리[0]) * 사거리 * 0.9) / d, 적자리[1] + ((캐자리[1] - 적자리[1]) * 사거리 * 0.9) / d];
    if (무엇 === '공격') {
      const 공 = m.캐릭터.공격!;
      return { 자리: 설자리, 기록: 기(설자리), 가능초: 캐쿨, 효과: () => { if (후보.체력 <= 0 || 거리(자리(후보), 캐자리) > 공.사거리 * 1.5) return false; 맞기(후보, 공.공격력); 캐쿨 = 지금 + 공.간격; return true; } };
    }
    const 템 = m.아이템[대상!]!;
    return { 자리: 설자리, 기록: 기(설자리), 효과: () => { if ((쿨[템.이름] ?? 0) > 지금) return false; const 중심 = 후보.체력 > 0 ? 자리(후보) : 적자리; for (const e of 둘레적(중심, Math.max(템.범위, 0.01))) 맞기(e, 템.피해, undefined, 템.기절); 쿨[템.이름] = 지금 + 템.쿨타임; 남은개수[템.이름]! -= 1; return true; } };
  };

  const 재현할일 = (x: 행동): 할일 => {
    const 규 = { 조건: [], 행동: { 무엇: x.행동, ...(x.대상 === undefined ? {} : { 대상: x.대상 }), ...(x.자리 === undefined ? {} : { 자리: x.자리 }) } } as unknown as 규칙;
    const 자 = x.자리 ?? 캐자리;
    // 재현은 판이 한 자리에서 한다 — 놓기는 그 자리에, 키우기는 그 자리에 가장 가까운 탑을
    const 효과 = (): boolean => {
      if (x.행동 === '놓기') { const 종 = m.설치물종류[x.대상 ?? '']; const 첫 = 종?.레벨[0]; if (종 === undefined || 첫 === undefined || 재화 < 첫.값) return false; 재화 -= 첫.값; 탑들.push(새탑(종.이름, 자)); return true; }
      // 먹이도 기록한 자리에 가장 가까운 그 종류 탑에 준다
      if (x.행동 === '먹이') { const 탑 = 탑들.filter((t) => t.종류 === x.대상 && 유지받나(t)).sort((a, b) => 거리(a.자리, 자) - 거리(b.자리, 자))[0]; const 먹 = 탑 === undefined ? undefined : m.설치물종류[탑.종류]!.유지?.먹이; if (탑 === undefined || 먹 === undefined || 재화 < 먹.값) return false; 재화 -= 먹.값; 탑.유지 = Math.min(m.설치물종류[탑.종류]!.유지!.체력, 탑.유지 + 먹.양); return true; }
      if (x.행동 === '키우기') { const 탑 = 탑들.filter((t) => t.종류 === x.대상).sort((a, b) => 거리(a.자리, 자) - 거리(b.자리, 자))[0]; const 값 = 탑 === undefined ? undefined : m.설치물종류[탑.종류]!.레벨[탑.레벨 + 1]?.값; if (탑 === undefined || 값 === undefined || 재화 < 값) return false; 재화 -= 값; 탑.레벨 += 1; return true; }
      // 한 번에 주운 자리들 — 그 자리마다 줍는 거리 안의 재화가 들어온다
      if (x.행동 === '줍기' && x.자리들 !== undefined) { for (let i = 떨어진.length - 1; i >= 0; i -= 1) if (x.자리들.some((p) => 거리(떨어진[i]!.자리, p) <= m.재화.줍는거리)) 재화 += 떨어진.splice(i, 1)[0]!.값; return true; }
      const 계 = 계획(규, x.초);
      return 계 === null ? false : 계.효과();
    };
    // 판에서 안 된 행동(됨: false)은 시간만 쓰고 효과가 없다 — 안 놓인 놓기가 재현에서 놓이면 재현이 판보다 멀리 간다
    return { 도착초: x.도착초 ?? x.초, 끝초: x.끝초 ?? x.도착초 ?? x.초, 자리: 자, 기록: { ...x }, 효과: x.됨 === false ? () => false : 효과 };
  };

  for (let k = 0; k * 칸초 <= 최대초; k += 1) {
    지금 = Math.round(k * 칸초 * 1000) / 1000;
    // 웨이브 시작 · 출현
    if (웨이브i + 1 < m.웨이브.length && 지금 >= 다음시작) {
      웨이브i += 1;
      const w = m.웨이브[웨이브i]!;
      for (const o of w.출현) for (let n = 0; n < o.수; n += 1) 출현표.push({ 초: 지금 + o.처음초 + n * o.간격, 웨이브: 웨이브i, 종류: o.종류, 길: o.길 });
      셈[웨이브i]!.남은출현 = w.출현.reduce((a, o) => a + o.수, 0);
      // 시작초를 적은 다음 웨이브는 앞 웨이브가 안 끝나도 그 시각에 나온다(시간으로 넘어가는 게임)
      다음시작 = m.웨이브[웨이브i + 1]?.시작초 ?? Infinity;
    }
    for (const s of 출현표.filter((x) => x.초 <= 지금)) {
      const 종 = m.적종류[s.종류]!;
      const 길 = m.길[s.길]!;
      적들.push({ 종류: 종.이름, 체력: 종.체력, 길, 누적: 누적길이(길), 진행: 0, 둔화: 0, 배율: 1, 기절: 0, 웨이브: s.웨이브, 쿨: 0, 닿음: false });
      셈[s.웨이브]!.남은출현 -= 1;
    }
    출현표 = 출현표.filter((x) => x.초 > 지금);
    // 적 걷기 · 닿기 · 캐릭터 때리기
    for (const e of 산적()) {
      // 길 끝에 선 적은 안 걷고 지킬것을 깎는다
      // 기절한 적은 길 끝에서도 안 깎는다
      if (e.기절 > 0) e.기절 -= 칸초;
      else if (e.닿음) 지킬것 -= m.적종류[e.종류]!.끝초당피해! * 칸초;
      else e.진행 += m.적종류[e.종류]!.속도 * (e.둔화 > 0 ? e.배율 : 1) * 칸초;
      if (e.둔화 > 0) e.둔화 -= 칸초;
      const 공 = m.적종류[e.종류]!.공격;
      if (공 !== undefined && 쓰러짐 <= 지금 && e.쿨 <= 지금 && 거리(자리(e), 캐자리) <= 공.사거리) {
        캐체력 -= 공.피해;
        e.쿨 = 지금 + 공.간격;
        if (캐체력 <= 0) [쓰러짐, 캐체력, 할] = [지금 + m.캐릭터.쓰러지면초, 캐체력최대, null];
      }
    }
    for (const e of 산적().filter((x) => !x.닿음 && 남은(x) <= 0)) {
      지킬것 -= m.적종류[e.종류]!.닿으면피해;
      셈[e.웨이브]!.새어나감 += 1;
      셈[e.웨이브]!.새체력 += Math.max(0, e.체력);
      // 끝초당피해가 있으면 사라지지 않고 서서 죽을 때까지 깎는다(16100 — 한 번 깎고 사라지면 실제보다 낙관적이다)
      if (m.적종류[e.종류]!.끝초당피해 !== undefined) [e.닿음, e.진행] = [true, e.누적.at(-1)!];
      else e.체력 = -Infinity;
    }
    // 설치물 — 자란 것이 사거리 안에서 길 끝에 가장 가까운 적부터 타깃수만큼
    for (const t of [...탑들]) {
      // 유지 — 체력이 시간에 따라 줄고 다하면 멈추거나 사라진다(16098 — 유지비로 고기가 다 나가 업그레이드를 못 했다)
      const 유 = m.설치물종류[t.종류]!.유지;
      if (유 !== undefined && 유지받나(t) && t.유지 > 0) t.유지 = Math.max(0, t.유지 - 유.초당감소 * 칸초);
      // 유지없음 레벨로 키우면 다시 때린다
      if (유지받나(t) && t.유지 <= 0) {
        if (유!.다하면 === '사라짐') 탑들.splice(탑들.indexOf(t), 1);
        continue;
      }
      if (t.자람 > 0) { t.자람 -= 칸초; continue; }
      if (t.쿨 > 지금) continue;
      const l = m.설치물종류[t.종류]!.레벨[t.레벨]!;
      const 대상들 = 둘레적(t.자리, l.사거리).filter((e) => e.체력 > 0).sort((a, b) => 남은(a) - 남은(b)).slice(0, l.타깃수);
      if (대상들.length === 0) continue;
      for (const e of 대상들) for (const x of l.범위 > 0 ? 둘레적(자리(e), l.범위) : [e]) 맞기(x, l.공격력, l.둔화, l.기절);
      t.쿨 = 지금 + l.간격;
    }
    // 처치 · 보상
    for (const e of 적들.filter((x) => x.체력 <= 0 && x.체력 !== -Infinity)) {
      셈[e.웨이브]!.처치 += 1;
      const 보상 = m.적종류[e.종류]!.보상;
      if (m.재화.줍기) 떨어진.push({ 자리: 자리(e), 값: 보상 });
      else 재화 += 보상;
    }
    for (let i = 적들.length - 1; i >= 0; i -= 1) if (적들[i]!.체력 <= 0) 적들.splice(i, 1);
    재화 += m.재화.초당 * 칸초;
    주워담기(캐자리, false);
    // 캐릭터 — 할 일이 없으면 고르고, 도착 · 끝 시각이 됐으면 옮기고 한다. 고른 칸에 바로 끝나는 일(걷지 않고 손 0)은 그 칸에 한다. 재현이면 기록의 다음 행동을 그 시각에
    if (할 === null && 쓰러짐 <= 지금) {
      if (재현남은 !== null) {
        const 다음 = 재현남은[0];
        if (다음 !== undefined && (다음.도착초 ?? 다음.초) <= 지금) 할 = 재현할일(재현남은.shift()!);
      } else {
        let 고른: ReturnType<typeof 계획> = null;
        for (const r of 정책) {
          고른 = r.조건.every((c) => 맞나(상태(c.값, c.반경), c.비교, c.기준 as number)) ? 계획(r, 지금) : null;
          if (고른 !== null) break;
        }
        // 할 수 있는 규칙이 없으면 다음 칸에 다시 본다
        if (고른 !== null) {
          const 도착 = 지금 + 걷기(캐자리, 고른.자리) / m.캐릭터.걷기속도;
          // 쿨타임은 걷는 동안에도 돈다 — 도착 뒤 손 시간과 쿨타임이 끝나는 때 가운데 늦은 쪽
          // 이어서 줍는 것은 한 바퀴다 — 손 시간은 그 바퀴의 처음 한 번만 든다(판에서도 한 번 읽고 가까운 것부터 다 줍는다)
          const 든손 = 고른.기록.행동 === '줍기' && 앞행동 === '줍기' ? 0 : Math.max(손초(고른.기록.행동), 고른.손초 ?? 0);
          할 = { 도착초: 도착, 끝초: Math.max(도착 + 든손, 고른.가능초 ?? 0), 자리: 고른.자리, 기록: 고른.기록, 효과: 고른.효과 };
        }
      }
    }
    if (할 !== null && 지금 >= 할.도착초) 캐자리 = 할.자리;
    if (할 !== null && 지금 >= 할.끝초) {
      const 됨 = 할.효과();
      기록.push({ ...할.기록, 도착초: Math.round(할.도착초 * 10) / 10, 끝초: Math.round(지금 * 10) / 10, 됨 });
      [앞행동, 할] = [할.기록.행동, null];
    }
    if (Math.abs(지금 / 예상간격초 - Math.round(지금 / 예상간격초)) < 1e-6) {
      const 연 = m.볼값연결;
      예상.push({ 초: 지금, 값: { ...(연.웨이브 === undefined ? {} : { [연.웨이브]: 웨이브i + 1 }), ...(연.지킬것 === undefined ? {} : { [연.지킬것]: Math.round(지킬것 * 10) / 10 }), ...(연.재화 === undefined ? {} : { [연.재화]: Math.round(재화 * 10) / 10 }) } });
    }
    if (지킬것 <= 0) return { 이김: false, 웨이브: 결과웨이브, 짐: { 웨이브: m.웨이브[웨이브i]?.이름 ?? '시작 전', 초: 지금, 새어나간체력: Math.round(셈[웨이브i]?.새체력 ?? 0), 쥔재화: Math.round(재화) }, 예상, 행동기록: 기록 };
    // 웨이브 끝 — 다 나왔고 그 웨이브 적이 없다. 시작초로 겹쳐 나온 웨이브도 앞에서부터 차례로 닫는다
    for (let j = 결과웨이브.length; j <= 웨이브i && 셈[j]!.남은출현 === 0 && !적들.some((e) => e.웨이브 === j); j += 1) {
      결과웨이브.push({ 이름: m.웨이브[j]!.이름, 처치: 셈[j]!.처치, 새어나감: 셈[j]!.새어나감, 끝지킬것: Math.round(지킬것 * 10) / 10, 끝재화: Math.round(재화), 끝초: 지금 });
      const 다음 = m.웨이브[j + 1];
      if (다음 === undefined) return { 이김: true, 웨이브: 결과웨이브, 예상, 행동기록: 기록 };
      if (j === 웨이브i && 다음.시작초 === undefined) 다음시작 = 지금 + 다음.쉬는초;
    }
  }
  return { 이김: false, 웨이브: 결과웨이브, 짐: { 웨이브: m.웨이브[웨이브i]?.이름 ?? '시작 전', 초: 최대초, 새어나간체력: 0, 쥔재화: Math.round(재화), 시간넘음: true }, 예상, 행동기록: 기록 };
}
