// 게임플레이 시뮬레이션 입력 — AI 가 빌드 데이터 · 지도로 채운 JSON 을 읽어 엔진 모델로 바꾸고 틀린 칸을 알린다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 엔진은 게임을 모른다. 적 · 웨이브 · 설치물 · 캐릭터 · 아이템 · 회복 · 재화 · 정책은 게임마다 AI 가 채우고, 여기는 형태만 본다

import { 세계만들기, 세계틀읽기 } from './world.js';

export type 점 = readonly [number, number];
export type 비교 = '>=' | '<=' | '>' | '<' | '==';
export const 상태이름들 = ['지킬것체력', '지킬것비율', '재화', '캐릭터체력비율', '웨이브', '지킬것둘레적수', '캐릭터둘레적수', '캐릭터둘레재화수', '지킬것가까운적거리', '유지최저비율'] as const;
export type 상태이름 = (typeof 상태이름들)[number];
export const 행동종류들 = ['아이템', '회복', '공격', '키우기', '놓기', '먹이', '줍기', '이동'] as const;
export type 행동종류 = (typeof 행동종류들)[number];

/** 끝초당피해 — 길 끝에 닿으면 사라지지 않고 서서 죽을 때까지 지킬것을 초당 이만큼 깎는다(닿으면피해는 닿는 순간 한 번) */
export interface 적종류 { 이름: string; 체력: number; 속도: number; 닿으면피해: number; 보상: number; 끝초당피해?: number; 공격?: { 사거리: number; 피해: number; 간격: number } }
export interface 출현 { 종류: string; 수: number; 간격: number; 길: string; 처음초: number }
export interface 웨이브 { 이름: string; 쉬는초: number; 시작초?: number; 출현: 출현[]; 보스: boolean }
export interface 레벨 { 값: number; 사거리: number; 공격력: number; 간격: number; 타깃수: number; 범위: number; 둔화?: { 배율: number; 초: number }; 기절?: number; 유지없음?: true }
/** 유지 — 놓은 뒤 체력이 초당감소만큼 줄고 다하면 멈추거나 사라진다. 먹이(재화 · 손 시간)로 다시 채운다. 유지없음 레벨은 안 준다 */
/** 근거 — 이 값을 잰 지도 줄 열쇠. 지침 예시 숫자를 베껴 깬 맵까지 「이기는 안 없음」이 됐다(16102) */
export interface 유지 { 체력: number; 초당감소: number; 다하면: '멈춤' | '사라짐'; 먹이?: { 값: number; 양: number; 초: number }; 근거: string }
export interface 설치물종류 { 이름: string; 자라는초: number; 레벨: 레벨[]; 유지?: 유지 }
export interface 아이템 { 이름: string; 쿨타임: number; 사거리: number; 범위: number; 피해: number; 기절?: number; 개수?: number }
export interface 회복수단 { 이름: string; 대상: '캐릭터' | '지킬것'; 값: number; 양: number; 쿨타임: number }
export interface 캐릭터 { 자리: 점; 걷기속도: number; 체력?: number; 쓰러지면초: number; 공격?: { 사거리: number; 공격력: number; 간격: number } }
export interface 조건 { 값: 상태이름; 반경?: number; 비교: 비교; 기준: number | string }
/** 고르기 — 키우기가 여럿 가운데 무엇부터 키우나. 높은 = 레벨이 높은 것부터(하나를 끝까지 몰아 키운다) · 낮은 = 낮은 것부터(고루). 없으면 길을 많이 덮는 것부터 */
export interface 규칙 { 조건: 조건[]; 행동: { 무엇: 행동종류; 대상?: string; 자리?: 점; 반경?: number; 고르기?: '높은' | '낮은' } }
/**
 * 판 중간에서 이어 흘릴 때의 상태 — 순서대로 하기(follow.ts)가 판에서 읽어 넣는다. 입력 파일에는 없다.
 * 레벨은 놓은 직후가 1 · 유지는 남은 비율(0~1 · 못 읽으면 가득) · 떨어진은 바닥에 떨어진 재화 자리
 */
/** 시뮬 결과 — sim.ts 가 낸다(여기 두는 것은 sim.ts 가 300줄을 넘지 않게) */
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
/** 적 — 웨이브 도중 이어 흘릴 때 판에서 읽은 적. 첫 웨이브가 시작할 때 그 길의 진행 거리에 바로 선다 */
export interface 시작상태 { 지킬것: number; 재화: number; 자리: 점; 설치물: { 종류: string; 레벨: number; 자리: 점; 유지?: number }[]; 떨어진: 점[]; 첫웨이브까지초: number; 적?: { 종류: string; 길: string; 진행: number }[] }
export interface 모델 {
  곳: string;
  지킬것: { 체력: number; 자리: 점 };
  길: Record<string, 점[]>;
  적종류: Record<string, 적종류>;
  웨이브: 웨이브[];
  설치물종류: Record<string, 설치물종류>;
  /** 놓인 설치물 둘레 이 반경 안에는 다른 설치물을 못 놓는다 — 설치물이 있으면 입력에 있어야 한다. 근거는 유지 근거와 같다(16104 는 엔진이 식물 바로 옆을 빈자리로 골라 놓기가 다섯 번 이어 안 됐다) */
  설치물둘레?: { 반경: number; 근거: string };
  자리후보: 점[];
  캐릭터: 캐릭터;
  아이템: Record<string, 아이템>;
  회복: Record<string, 회복수단>;
  재화: { 시작: number; 초당: number; 줍기: boolean; 줍는거리: number };
  /** 종류별 — 판에서 잰 종류마다 손 시간(없는 종류는 행동초). 입력 파일에는 못 적는다 */
  손: { 행동초: number; 종류별?: Partial<Record<행동종류, number>> };
  /** 처치 — 재현 비교가 판에서 올라간 처치 수와 견준다(판 값이 누적이든 웨이브마다 0 으로 돌아가든) */
  볼값연결: { 웨이브?: string; 지킬것?: string; 재화?: string; 처치?: string };
  정책들: 규칙[][];
  문턱후보: Record<string, number[]>;
  재현?: { 기록: string };
  시작?: 시작상태;
  /** 게임 세계 코드 글 — 계산기가 입력의 세계(파일 이름)를 읽어 넣는다. 없으면 본보기 세계(world.ts) */
  세계글?: string;
}

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 양수 = (v: unknown): v is number => 수(v) && v > 0;
const 글 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 점인가 = (v: unknown): v is 점 => Array.isArray(v) && v.length === 2 && v.every(수);
const 목록 = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const 없거나 = (v: unknown, 맞나: (x: unknown) => boolean): boolean => v === undefined || 맞나(v);

class 틀림 extends Error {}
const 요구 = (맞나: boolean, 글월: string): void => {
  if (!맞나) throw new 틀림(글월);
};

function 이름표<T extends { 이름: string }>(들: T[], 무엇: string): Record<string, T> {
  const r: Record<string, T> = {};
  for (const x of 들) {
    요구(r[x.이름] === undefined, `${무엇} 이름 ${x.이름} 이 두 번 나온다`);
    r[x.이름] = x;
  }
  return r;
}

function 레벨읽기(v: unknown, 어디: string): 레벨 {
  const x = 객체(v);
  요구(수(x.값) && 양수(x.사거리) && 수(x.공격력) && 양수(x.간격) && 없거나(x.타깃수, 양수) && 없거나(x.범위, 수) && 없거나(x.기절, 양수) && 없거나(x.유지없음, (y) => y === true), `${어디} 는 { 값, 사거리, 공격력, 간격(0 보다 큼, 초), 타깃수?, 범위?(맞은 자리 둘레도 맞힘), 둔화? { 배율, 초 }, 기절?(초), 유지없음?: true } 이다`);
  const 둔 = 객체(x.둔화);
  요구(x.둔화 === undefined || (수(둔.배율) && 둔.배율 >= 0 && 둔.배율 < 1 && 양수(둔.초)), `${어디}.둔화 는 { 배율(0 이상 1 미만 · 느려진 속도 비율), 초 } 이다`);
  return { 값: x.값 as number, 사거리: x.사거리 as number, 공격력: x.공격력 as number, 간격: x.간격 as number, 타깃수: (x.타깃수 as number | undefined) ?? 1, 범위: (x.범위 as number | undefined) ?? 0, ...(x.둔화 === undefined ? {} : { 둔화: { 배율: 둔.배율 as number, 초: 둔.초 as number } }), ...(x.기절 === undefined ? {} : { 기절: x.기절 as number }), ...(x.유지없음 === true ? { 유지없음: true as const } : {}) };
}

function 규칙읽기(v: unknown, 어디: string): 규칙 {
  const x = 객체(v);
  const 행 = 객체(x.행동);
  요구(Array.isArray(x.조건) && (행동종류들 as readonly unknown[]).includes(행.무엇) && 없거나(행.대상, 글) && 없거나(행.자리, 점인가) && 없거나(행.반경, 양수) && 없거나(행.고르기, (y) => y === '높은' || y === '낮은'), `${어디} 는 { 조건: [{ 값, 반경?, 비교, 기준 }], 행동: { 무엇(${행동종류들.join(' · ')}), 대상?, 자리?, 반경?, 고르기?(키우기 — 높은 · 낮은) } } 이다`);
  const 조건들 = 목록(x.조건).map((c, i) => {
    const y = 객체(c);
    요구((상태이름들 as readonly unknown[]).includes(y.값) && ['>=', '<=', '>', '<', '=='].includes(y.비교 as string) && (수(y.기준) || (글(y.기준) && y.기준.startsWith('$'))) && 없거나(y.반경, 양수), `${어디}.조건 ${i + 1}번은 { 값(${상태이름들.join(' · ')}), 반경?(둘레 수를 셀 거리), 비교(>= · <= · > · < · ==), 기준(수나 $문턱이름) } 이다`);
    요구(!String(y.값).includes('둘레') || 양수(y.반경), `${어디}.조건 ${i + 1}번 ${String(y.값)} 은 반경이 있어야 센다`);
    return { 값: y.값 as 상태이름, 비교: y.비교 as 비교, 기준: y.기준 as number | string, ...(y.반경 === undefined ? {} : { 반경: y.반경 as number }) };
  });
  return { 조건: 조건들, 행동: { 무엇: 행.무엇 as 행동종류, ...(행.대상 === undefined ? {} : { 대상: 행.대상 as string }), ...(행.자리 === undefined ? {} : { 자리: 행.자리 as 점 }), ...(행.반경 === undefined ? {} : { 반경: 행.반경 as number }), ...(행.고르기 === undefined ? {} : { 고르기: 행.고르기 as '높은' | '낮은' }) } };
}

/** 입력 JSON 을 모델로 — 틀리면 무엇이 틀렸나 한 줄 */
export function 입력읽기(입력: Record<string, unknown>): 모델 | { 틀림: string } {
  try {
    const 지 = 객체(입력.지킬것);
    요구(글(입력.곳), '곳 에 깰 STAGE 줄 열쇠를 적는다');
    요구(양수(지.체력) && 점인가(지.자리), '지킬것 은 { 체력, 자리: [x, z] } 이다');
    const 길: Record<string, 점[]> = {};
    for (const [k, v] of Object.entries(객체(입력.길))) {
      요구(Array.isArray(v) && v.length >= 2 && v.every(점인가), `길.${k} 는 [[x, z], …] 점 둘 이상이다(적이 나와서 지킬것까지 가는 길)`);
      길[k] = v as 점[];
    }
    요구(Object.keys(길).length > 0, '길 은 { <이름>: [[x, z], …] } 하나 이상이다');
    const 적 = 이름표(목록(입력.적종류).map((v, i) => {
      const x = 객체(v);
      const 공 = 객체(x.공격);
      요구(글(x.이름) && 양수(x.체력) && 양수(x.속도) && 수(x.닿으면피해) && 수(x.보상) && 없거나(x.끝초당피해, 양수) && (x.공격 === undefined || (양수(공.사거리) && 수(공.피해) && 양수(공.간격))), `적종류 ${i + 1}번은 { 이름, 체력, 속도(길 단위/초), 닿으면피해(닿는 순간 지킬것을 깎는 양), 보상, 끝초당피해?(길 끝에 서서 죽을 때까지 초당 깎는 양), 공격? { 사거리, 피해, 간격 } } 이다`);
      return { 이름: x.이름 as string, 체력: x.체력 as number, 속도: x.속도 as number, 닿으면피해: x.닿으면피해 as number, 보상: x.보상 as number, ...(x.끝초당피해 === undefined ? {} : { 끝초당피해: x.끝초당피해 as number }), ...(x.공격 === undefined ? {} : { 공격: { 사거리: 공.사거리 as number, 피해: 공.피해 as number, 간격: 공.간격 as number } }) };
    }), '적종류');
    const 웨이브들 = 목록(입력.웨이브).map((v, i) => {
      const x = 객체(v);
      요구(목록(x.출현).length > 0 && 없거나(x.쉬는초, (y) => 수(y) && y >= 0) && 없거나(x.시작초, (y) => 수(y) && y >= 0), `웨이브 ${i + 1}번은 { 이름?, 쉬는초?(앞 웨이브가 끝나고 이 웨이브가 시작할 때까지) | 시작초?(판 시작부터), 출현: [{ 종류, 수, 간격, 길, 처음초? }], 보스? } 이다`);
      const 출현들 = 목록(x.출현).map((o, j) => {
        const y = 객체(o);
        요구(글(y.종류) && 적[y.종류] !== undefined && 양수(y.수) && 수(y.간격) && y.간격 >= 0 && 글(y.길) && 길[y.길] !== undefined && 없거나(y.처음초, (z) => 수(z) && z >= 0), `웨이브 ${i + 1}번 출현 ${j + 1}번은 { 종류(적종류 이름), 수, 간격(초), 길(길 이름), 처음초? } 이다`);
        return { 종류: y.종류 as string, 수: Math.round(y.수 as number), 간격: y.간격 as number, 길: y.길 as string, 처음초: (y.처음초 as number | undefined) ?? 0 };
      });
      return { 이름: 글(x.이름) ? x.이름 : `${i + 1}웨이브`, 쉬는초: (x.쉬는초 as number | undefined) ?? 0, ...(x.시작초 === undefined ? {} : { 시작초: x.시작초 as number }), 출현: 출현들, 보스: x.보스 === true };
    });
    요구(웨이브들.length > 0, '웨이브 는 하나 이상 적은 목록이다');
    const 설치 = 이름표(목록(입력.설치물종류).map((v, i) => {
      const x = 객체(v);
      요구(글(x.이름) && 목록(x.레벨).length > 0 && 없거나(x.자라는초, (y) => 수(y) && y >= 0), `설치물종류 ${i + 1}번은 { 이름, 자라는초?(놓고 때리기 시작할 때까지), 레벨: [{ … }], 유지? } 이다`);
      const 유 = 객체(x.유지);
      const 먹 = 객체(유.먹이);
      요구(x.유지 === undefined || (양수(유.체력) && 양수(유.초당감소) && (유.다하면 === '멈춤' || 유.다하면 === '사라짐') && (유.먹이 === undefined || (수(먹.값) && 양수(먹.양) && 수(먹.초) && 먹.초 >= 0)) && 글(유.근거)), `설치물종류 ${String(x.이름)} 의 유지 는 { 체력, 초당감소, 다하면(멈춤 · 사라짐), 먹이?: { 값(드는 재화), 양(채우는 체력), 초(먹이는 데 드는 손 시간) }, 근거(이 값을 잰 지도 줄 열쇠) } 이다 — 지침 예시 숫자를 쓰지 않는다`);
      return { 이름: x.이름 as string, 자라는초: (x.자라는초 as number | undefined) ?? 0, 레벨: 목록(x.레벨).map((l, j) => 레벨읽기(l, `설치물종류 ${x.이름 as string} 레벨 ${j + 1}`)), ...(x.유지 === undefined ? {} : { 유지: { 체력: 유.체력 as number, 초당감소: 유.초당감소 as number, 다하면: 유.다하면 as 유지['다하면'], ...(유.먹이 === undefined ? {} : { 먹이: { 값: 먹.값 as number, 양: 먹.양 as number, 초: 먹.초 as number } }), 근거: 유.근거 as string } }) };
    }), '설치물종류');
    const 둘 = 객체(입력.설치물둘레);
    요구((Object.keys(설치).length === 0 && 입력.설치물둘레 === undefined) || (양수(둘.반경) && 글(둘.근거)), '설치물둘레 는 { 반경(놓인 설치물 둘레 이 거리 안에는 다른 설치물을 못 놓는다), 근거(이 값을 잰 지도 줄 열쇠나 빌드 데이터:<타입 이름>) } 이다 — 설치물이 있으면 적는다. 없으면 엔진이 놓인 설치물 바로 옆을 빈자리로 골라 판에서 놓기가 안 된다');
    const 캐 = 객체(입력.캐릭터);
    const 캐공 = 객체(캐.공격);
    요구(점인가(캐.자리) && 양수(캐.걷기속도) && 없거나(캐.체력, 양수) && 없거나(캐.쓰러지면초, 수) && (캐.공격 === undefined || (양수(캐공.사거리) && 수(캐공.공격력) && 양수(캐공.간격))), '캐릭터 는 { 자리: [x, z](시작 자리), 걷기속도, 체력?, 쓰러지면초?(체력이 0 이 되면 못 움직이는 초), 공격? { 사거리, 공격력, 간격 } } 이다');
    const 아이템들 = 이름표(목록(입력.아이템).map((v, i) => {
      const x = 객체(v);
      요구(글(x.이름) && 수(x.쿨타임) && 수(x.사거리) && 수(x.범위) && 수(x.피해) && 없거나(x.기절, 양수) && 없거나(x.개수, 양수), `아이템 ${i + 1}번은 { 이름, 쿨타임, 사거리(던지는 거리), 범위, 피해, 기절?, 개수? } 이다`);
      return { 이름: x.이름 as string, 쿨타임: x.쿨타임 as number, 사거리: x.사거리 as number, 범위: x.범위 as number, 피해: x.피해 as number, ...(x.기절 === undefined ? {} : { 기절: x.기절 as number }), ...(x.개수 === undefined ? {} : { 개수: x.개수 as number }) };
    }), '아이템');
    const 회복들 = 이름표(목록(입력.회복).map((v, i) => {
      const x = 객체(v);
      요구(글(x.이름) && (x.대상 === '캐릭터' || x.대상 === '지킬것') && 수(x.값) && 양수(x.양) && 없거나(x.쿨타임, 수), `회복 ${i + 1}번은 { 이름, 대상(캐릭터 · 지킬것), 값(드는 재화), 양, 쿨타임? } 이다`);
      return { 이름: x.이름 as string, 대상: x.대상 as '캐릭터' | '지킬것', 값: x.값 as number, 양: x.양 as number, 쿨타임: (x.쿨타임 as number | undefined) ?? 0 };
    }), '회복');
    const 재 = 객체(입력.재화);
    요구(수(재.시작) && 없거나(재.초당, 수) && 없거나(재.줍는거리, 양수), '재화 는 { 시작, 초당?, 줍기?(처치 자리에 떨어져 주워야 들어온다면 true), 줍는거리? } 이다');
    const 손 = 객체(입력.손);
    요구(없거나(손.행동초, (y) => 수(y) && y >= 0), '손 은 { 행동초?(도착해서 행동 하나를 끝낼 때까지) } 이다 — 잰 값이 있으면 그것이 이긴다');
    const 정책글 = 입력.정책들 ?? (입력.정책 === undefined ? undefined : [입력.정책]);
    요구(목록(정책글).length > 0 && 목록(정책글).every((p) => 목록(p).length > 0), '정책들 은 [[규칙, …], …] 이다(정책 하나면 정책: [규칙, …]) — 손 한 바퀴마다 위에서부터 조건이 맞고 할 수 있는 첫 규칙 하나를 한다');
    const 정책들 = 목록(정책글).map((p, i) => 목록(p).map((r, j) => 규칙읽기(r, `정책 ${i + 1} 규칙 ${j + 1}`)));
    const 문턱후보: Record<string, number[]> = {};
    for (const [k, v] of Object.entries(객체(입력.문턱후보))) {
      요구(Array.isArray(v) && v.length > 0 && v.every(수), `문턱후보.${k} 는 수 목록이다`);
      문턱후보[k] = v as number[];
    }
    const 쓴문턱 = new Set(정책들.flat().flatMap((r) => r.조건.map((c) => c.기준)).filter((x): x is string => typeof x === 'string').map((x) => x.slice(1)));
    const 빠진 = [...쓴문턱].filter((k) => 문턱후보[k] === undefined);
    요구(빠진.length === 0, `정책이 쓴 문턱 ${빠진.map((k) => `$${k}`).join(' · ')} 의 후보가 문턱후보 에 없다`);
    for (const r of 정책들.flat()) {
      const 대 = r.행동.대상;
      if (r.행동.무엇 === '놓기' || r.행동.무엇 === '키우기' || r.행동.무엇 === '먹이') 요구(대 !== undefined && 설치[대] !== undefined, `${r.행동.무엇} 의 대상은 설치물종류 이름이다(${대 ?? '없음'})`);
      if (r.행동.무엇 === '먹이') 요구(설치[대!]?.유지?.먹이 !== undefined, `먹이 의 대상 ${대!} 에 유지.먹이 가 없다`);
      if (r.행동.무엇 === '아이템') 요구(대 !== undefined && 아이템들[대] !== undefined, `아이템 의 대상은 아이템 이름이다(${대 ?? '없음'})`);
      if (r.행동.무엇 === '회복') 요구(대 !== undefined && 회복들[대] !== undefined, `회복 의 대상은 회복 이름이다(${대 ?? '없음'})`);
      if (r.행동.무엇 === '공격') 요구(캐.공격 !== undefined, '공격 규칙은 캐릭터.공격 이 있어야 한다');
      if (r.행동.무엇 === '이동') 요구(r.행동.자리 !== undefined || 대 === '지킬것', '이동 은 자리: [x, z] 나 대상: "지킬것" 을 적는다');
    }
    const 연 = 객체(입력.볼값연결);
    const 재현 = 객체(입력.재현);
    요구(입력.재현 === undefined || 글(재현.기록), '재현 은 { 기록: <판 기록 이름> } 이다');
    const 모: 모델 = {
      곳: 입력.곳 as string,
      지킬것: { 체력: 지.체력 as number, 자리: 지.자리 as 점 },
      길, 적종류: 적, 웨이브: 웨이브들, 설치물종류: 설치,
      ...(입력.설치물둘레 === undefined ? {} : { 설치물둘레: { 반경: 둘.반경 as number, 근거: 둘.근거 as string } }),
      자리후보: 목록(입력.자리후보).filter(점인가),
      캐릭터: { 자리: 캐.자리 as 점, 걷기속도: 캐.걷기속도 as number, 쓰러지면초: (캐.쓰러지면초 as number | undefined) ?? 0, ...(캐.체력 === undefined ? {} : { 체력: 캐.체력 as number }), ...(캐.공격 === undefined ? {} : { 공격: { 사거리: 캐공.사거리 as number, 공격력: 캐공.공격력 as number, 간격: 캐공.간격 as number } }) },
      아이템: 아이템들, 회복: 회복들,
      재화: { 시작: 재.시작 as number, 초당: (재.초당 as number | undefined) ?? 0, 줍기: 재.줍기 === true, 줍는거리: (재.줍는거리 as number | undefined) ?? 1 },
      손: { 행동초: (손.행동초 as number | undefined) ?? 0 },
      볼값연결: { ...(글(연.웨이브) ? { 웨이브: 연.웨이브 } : {}), ...(글(연.지킬것) ? { 지킬것: 연.지킬것 } : {}), ...(글(연.재화) ? { 재화: 연.재화 } : {}), ...(글(연.처치) ? { 처치: 연.처치 } : {}) },
      정책들, 문턱후보,
      ...(입력.재현 === undefined ? {} : { 재현: { 기록: 재현.기록 as string } }),
      ...(글(입력.세계글) ? { 세계글: 입력.세계글 } : {}),
    };
    // 게임 세계 코드는 읽고 한 번 만들어 본다 — 틀린 코드를 1500번 도는 순서 찾기에서야 알지 않게
    if (모.세계글 !== undefined) {
      const 틀 = 세계틀읽기(모.세계글);
      요구(!('틀림' in 틀), '틀림' in 틀 ? 틀.틀림 : '');
      try {
        세계만들기(모).읽기();
      } catch (e) {
        요구(false, `게임 세계 코드 — ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return 모;
  } catch (e) {
    if (e instanceof 틀림) return { 틀림: e.message };
    throw e;
  }
}

/** 정책의 $문턱 을 값으로 바꾼다 */
export const 문턱넣기 = (정책: readonly 규칙[], 값: Readonly<Record<string, number>>): 규칙[] =>
  정책.map((r) => ({ ...r, 조건: r.조건.map((c) => (typeof c.기준 === 'string' ? { ...c, 기준: 값[c.기준.slice(1)]! } : c)) }));
