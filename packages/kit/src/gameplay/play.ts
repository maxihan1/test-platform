// 케이스의 작전 함수가 부르는 순서대로 하기 — 계산기가 낸 순서자료로 판을 시뮬 순서대로 하고 어긋나면 그 자리에서 다시 계산한다 (도메인/게임 §3.10 「배운 것을 PRD · 테스트로」)
// 배울 때 조작 도우미가 하는 것과 같은 코드다(follow.ts) — 정식 실행에서도 같은 방식으로 게임해야 10판을 이긴다(2026-11-28 사용자 「케이스도 같은 방식」)
import { type 손, 따라가기 } from './follow.js';
import { 새기록, 손읽기 } from './followEntry.js';
import { type 잰손, 손넣기 } from './hand.js';
import { 입력읽기 } from './simInput.js';

/** 계산기가 `--case` 로 찍는 것 — 시뮬 입력 그대로 · 고른 순서 · 버금 순서 · 판에서 잰 손. 도우미 파일에 값으로 둔다 */
export interface 순서자료 { 입력: Record<string, unknown>; 정책: unknown; 버금?: unknown[]; 손?: Omit<잰손, '기록'> }

/** 순서자료의 순서를 규칙 목록으로 — 입력 읽기와 같은 검사를 거친다. 틀리면 무엇이 틀렸나 던진다 */
function 순서읽기(입력: Record<string, unknown>, v: unknown) {
  const m = 입력읽기({ ...입력, 정책: undefined, 정책들: [v], 문턱후보: {} });
  if ('틀림' in m) throw new Error(`순서자료가 틀렸다 — ${m.틀림}`);
  return m;
}

/** 판에 들어간 뒤에 부른다. 손은 판 함수가 쓰는 손동작(상태 · 설치물 · 떨어진 · 걷기 · 행동) */
export async function 순서대로(손: 손, 자료: 순서자료): Promise<{ 이김: boolean; 끝?: '이김' | '짐'; 행동수: number; 다시계산수: number }> {
  const 본 = 순서읽기(자료.입력, 자료.정책);
  const 버금 = (자료.버금 ?? []).map((v) => 순서읽기(자료.입력, v).정책들[0]!);
  const 읽은 = 손읽기(손, [본.정책들[0]!, ...버금]);
  if (typeof 읽은 === 'string') throw new Error(읽은);
  const 기록 = 새기록();
  const r = await 따라가기(읽은, { 모델: 자료.손 === undefined ? 본 : 손넣기(본, 자료.손), 정책: 본.정책들[0]!, 버금 }, 기록);
  // 케이스는 판에 들어간 뒤에 부른다 — 판 상태를 못 읽으면 판 함수가 잘못 들어간 것이라 그대로 실패로 알린다
  if ('못들어감' in r) throw new Error(r.못들어감);
  return { ...r, 행동수: 기록.행동기록.length, 다시계산수: 기록.다시계산.length };
}
