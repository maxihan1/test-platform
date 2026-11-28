// 게임 세계 코드 읽기 — AI 가 쓴 게임별 세계 코드(없으면 본보기)를 빈 실행 환경에서 읽어 시뮬이 부를 함수로 만든다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④ 게임 세계 코드)
// 2026-11-28 사용자 「AI 코드가 할 수 있는 일을 막는 방법도」 — 세계 코드는 계산기 · 게이트 · 케이스(러너)에서 돈다. 가져오기 · 파일 · 네트워크 · 프로세스에 닿지 못하게 한다
import { createContext, runInContext } from 'node:vm';

import type { 모델 } from './simInput.js';
import { 기본세계글 } from './worldDefault.js';

export { 기본세계글 };

/** 세계가 돌려주는 것 — 플랫폼은 수 · 글자만 넘기고 이 꼴의 값만 읽는다 */
export interface 세계읽음 { 재화: number; 지킬것: number; 웨이브: number; 처치: number; 캐체력비율: number; 쓰러짐까지: number }
export interface 세계 {
  흘리기(t: number, 캐x: number, 캐z: number): void;
  끝내기(t: number): '이김' | '짐' | null;
  읽기(): 세계읽음;
  적들(): { 번호: number; x: number; z: number; 남은: number }[];
  설치물들(): { 번호: number; 종류: string; 레벨: number; x: number; z: number; 유지중: boolean; 유지: number }[];
  떨어진(): { x: number; z: number; 값: number }[];
  놓을수있나(종류: string, x: number, z: number): boolean;
  쿨(무엇: string, 대상?: string): number;
  놓기(종류: string, x: number, z: number, 판에서됨: boolean): boolean;
  키우기(번호: number): boolean;
  먹이(번호: number): boolean;
  줍기(x: number, z: number): boolean;
  재현줍기(x: number, z: number): void;
  공격(번호: number, t: number, 캐x: number, 캐z: number): boolean;
  아이템(이름: string, 번호: number, 적x: number, 적z: number, t: number): boolean;
  회복(이름: string, t: number): boolean;
  결과(): { 웨이브: { 이름: string; 처치: number; 새어나감: number; 끝지킬것: number; 끝재화: number; 끝초: number }[]; 짐: { 웨이브: string; 초: number; 새어나간체력: number; 쥔재화: number } | null; 지금웨이브: string };
}
export type 세계틀 = (모델글: string, 시작글: string) => 세계;

const 함수들 = ['흘리기', '끝내기', '읽기', '적들', '설치물들', '떨어진', '놓을수있나', '쿨', '놓기', '키우기', '먹이', '줍기', '재현줍기', '공격', '아이템', '회복', '결과'] as const;
/**
 * 세계 코드에 못 쓰는 이름 — 빈 실행 환경이라 원래 없지만, 플랫폼 쪽 객체를 타고 나가는 길(constructor · __proto__)과 무작위 · 시각을 글에서 먼저 막는다.
 * ponytail: 글자 검사라 문자열을 이어 붙이면 지나간다 — 플랫폼은 세계에 객체를 하나도 넘기지 않고(수 · 글자만) 문자열로 코드를 만드는 것을 꺼서 그래도 밖으로 못 나간다. 무한 반복은 못 막는다(그 명령이 시간 한도에서 끊긴다)
 */
const 금지 = /\b(import|require|process|globalThis|global|module|exports|Function|eval|constructor|__proto__|prototype|Reflect|Proxy|WebAssembly|Atomics|SharedArrayBuffer|fetch|XMLHttpRequest|setTimeout|setInterval|setImmediate|queueMicrotask|Date|performance)\b|Math\.random/;
const 틀표 = new Map<string, 세계틀 | { 틀림: string }>();

/** 세계 코드 글을 읽어 세계틀로 — 못 쓰는 이름 · 함수가 아님 · 읽다 던짐이면 무엇이 틀렸나. 같은 글은 한 번만 읽는다 */
export function 세계틀읽기(글: string): 세계틀 | { 틀림: string } {
  const 앞 = 틀표.get(글);
  if (앞 !== undefined) return 앞;
  const 맨글 = 글.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  const 걸림 = 금지.exec(맨글);
  let r: 세계틀 | { 틀림: string };
  if (걸림 !== null) r = { 틀림: `게임 세계 코드에 ${걸림[0]} 를 쓸 수 없다 — 가져오기 · 파일 · 네트워크 · 무작위 · 시각 없이 모델과 시작 상태만으로 판을 흘린다(같은 입력이면 늘 같은 결과)` };
  else {
    try {
      const 상자 = createContext(Object.create(null) as object, { codeGeneration: { strings: false, wasm: false } });
      // 빈 실행 환경의 전역 이름은 찾을 때마다 느린 길을 탄다(같은 판이 세 배 느렸다) — 자주 쓰는 것을 지역 이름으로 묶어 넘긴다
      const 틀 = runInContext(`(function () { const { Math, Object, JSON, Number, Array, String, Boolean, Set, Map, Infinity, NaN, isFinite } = globalThis; return (${글}); })()`, 상자, { timeout: 1000 }) as unknown;
      r = typeof 틀 === 'function' ? (틀 as 세계틀) : { 틀림: '게임 세계 코드는 (function 세계(모델글, 시작글) { … return { 흘리기, 끝내기, 읽기, … } }) 꼴의 함수 하나다' };
    } catch (e) {
      r = { 틀림: `게임 세계 코드를 못 읽었다 — ${e instanceof Error ? e.message : String(e)}` };
    }
  }
  틀표.set(글, r);
  return r;
}

const 모델글표 = new WeakMap<object, string>();
/** 세계가 받는 모델 글 — 시뮬 입력을 읽은 모델에서 플랫폼만 쓰는 것(정책 · 손 · 세계글)은 뺀다. 같은 모델은 한 번만 만든다 */
function 모델글(m: 모델): string {
  const 앞 = 모델글표.get(m);
  if (앞 !== undefined) return 앞;
  const { 정책들: _정책, 문턱후보: _문턱, 손: _손, 재현: _재현, 시작: _시작, 세계글: _세계, ...남은 } = m;
  const 글 = JSON.stringify(남은);
  모델글표.set(m, 글);
  return 글;
}

/** 이 모델로 판 하나의 세계를 만든다 — 모델의 세계글이 없으면 본보기 세계. 세계 코드가 틀렸거나 던지면 문맥을 붙여 던진다 */
export function 세계만들기(m: 모델): 세계 {
  const 틀 = 세계틀읽기(m.세계글 ?? 기본세계글);
  if ('틀림' in 틀) throw new Error(틀.틀림);
  let 세: 세계;
  try {
    세 = 틀(모델글(m), m.시작 === undefined ? '' : JSON.stringify(m.시작));
  } catch (e) {
    throw new Error(`게임 세계 코드가 세계를 만들다 던졌다 — ${e instanceof Error ? e.message : String(e)}`);
  }
  const 빠진 = 함수들.filter((k) => typeof (세 as unknown as Record<string, unknown>)[k] !== 'function');
  if (빠진.length > 0) throw new Error(`게임 세계 코드가 돌려준 객체에 ${빠진.join(' · ')} 가 없다 — 본보기 세계(npx tsx scripts/authoring-game-calc.ts --world)의 함수를 다 둔다`);
  return 세;
}
