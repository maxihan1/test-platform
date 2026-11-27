// 결정 진행 준비 — 고른 것마다 권한 · 열쇠 · 값을 보고 진행 재료를 모은다. 잠금 전에 풀 연결로 읽기만 한다 (작성 §7 「결정 목록 통로」 POST · decisionRun.ts 가 쓴다)

import { 다시작성준비하기, type 다시작성준비 } from '../apidoc/rewrite.js';
import type { 초안카드 } from '../bts/draftDecide.js';
import { 상한 } from '../prd/rules.js';
import { 화면이맞음채우기, type 화면이맞음 } from '../prd/screenRight.js';
import { 요구문장, type 결정항목, type 확인결정 } from './decisionItems.js';
import { 버그판정실패, 최근대조 } from './decisionReads.js';
import { 결정재료읽기, type 부른이 } from './decisions.js';
import type { 받은것 } from './decisionBody.js';
import { 역방향칸판정 } from './reverse.js';

export interface 진행단계 {
  /** 6 은 「PRD 초안」 카드의 버리기 · 다시 만들기 — 다시 만들기만 requestId 가 찬다 */
  step: 1 | 2 | 3 | 4 | 5 | 6;
  key: string | null;
  requestId: number | null;
  version: number | null;
}

export type 진행결과 = { code: 201; body: { steps: 진행단계[] } } | { code: 400 | 403 | 409; body: Record<string, unknown> };

export const 낡음: 진행결과 = { code: 409, body: { error: 'DECISIONS_STALE' } };
export const 틀림 = (key: string): 진행결과 => ({ code: 400, body: { error: 'BAD_PICK', detail: key } });
const 권한없음 = (need: 'admin' | 'runs:write' | 'runs:read'): 진행결과 => ({ code: 403, body: { error: 'FORBIDDEN', need } });


export interface 준비 {
  버그: { key: string; runId: number; tcId: string }[];
  확인: { key: string; 결정: 확인결정 }[];
  반영: { key: string; rootId: number; runId: number }[];
  /** 반려 — 그 뿌리를 폐기한다(상세의 폐기와 같다) */
  반려: { key: string; rootId: number; runId: number }[];
  화면: { key: string; 칸: 화면이맞음 }[];
  요구다시: string | null;
  API: { key: string; 준비: 다시작성준비 } | null;
  /** skip — 이번 화면에서 고르지 않은 틀. AI 가 확인한 화면으로 보고 건너뛴다(params.skipScreens) */
  보완: { key: string; env: string; startUrl: string | null; skip: string[] } | null;
  초안: { key: string; card: 초안카드; rows: number[] }[];
  /** 버리기 · 다시 만들기 — 끝난 초안 버리기는 고른 줄 없이 진행으로 남기고, 실패 · 멈춘 초안 버리기는 폐기로 찍는다 */
  초안끝: { key: string; requestId: number; pick: 'DROP' | 'RETRY'; done: boolean }[];
  /** 설명 안 되는 줄 판정 — RULE 의 고친 문장은 확인에 같이 들어 한 버전이 된다 */
  설명: { key: string; runId: number; tcId: string; verdict: 'BUG' | 'RULE' }[];
  /** 고를 때 본 열린 작성 — 잠금 안에서 다시 견준다 */
  열린: number[];
}

/** 고른 것마다 권한 · 열쇠 · 값을 보고 진행 재료를 모은다. 풀 연결로 읽기만 한다 — 잠금을 잡기 전이다 */
export async function 준비하기(서비스: number, 누구: 부른이, 본문: { prdVersion: number; picks: 받은것[] }): Promise<준비 | 진행결과> {
  const 재료 = await 결정재료읽기(서비스, 누구, false);
  if (본문.prdVersion !== 재료.목록.prdVersion) return 낡음;
  const 항목들 = new Map(재료.목록.items.map((x) => [x.key, x]));
  const 준: 준비 = { 버그: [], 확인: [], 반영: [], 반려: [], 화면: [], 요구다시: null, API: null, 보완: null, 초안: [], 초안끝: [], 설명: [], 열린: 재료.목록.open };
  const 본열쇠 = new Set<string>();
  for (const p of 본문.picks) {
    if (본열쇠.has(p.key)) return 틀림(p.key);
    본열쇠.add(p.key);
    if ((p.key.startsWith('fail:') || p.key.startsWith('note:')) && !누구.실행읽기) return 권한없음('runs:read');
    const 항목 = 항목들.get(p.key) ?? 재료.실패.get(p.key) ?? (p.pick === 'SCREEN' ? await 버그판정실패(서비스, p.key) : null);
    if (항목 === null || 항목 === undefined) return 낡음;
    if (!(항목.picks as string[]).includes(p.pick)) {
      if ((p.pick === 'APPLY' || p.pick === 'REJECT') && 항목.blockedBy === 'ADMIN_ONLY') return 권한없음('admin');
      if (p.pick === 'BUG' && 항목.blockedBy === 'NO_RUN_WRITE') return 권한없음('runs:write');
      return 틀림(p.key);
    }
    // ③ 이 반영 대기를 기다리면 ① 을 모두 「올린다」로 골라야 한다 — 그래야 ③ 이 반영 뒤에 센 값으로 돈다
    if (항목.needsApply === true) {
      const 대기 = 재료.목록.items.filter((x) => x.kind === 'APPLY');
      if (!대기.every((x) => 본문.picks.some((q) => q.key === x.key && q.pick === 'APPLY'))) return 틀림(p.key);
    }
    const 결과 = await 하나준비(서비스, 항목, p, 준);
    if (결과 !== null) return 결과;
  }
  return 준;
}

async function 하나준비(서비스: number, 항목: 결정항목, p: 받은것, 준: 준비): Promise<진행결과 | null> {
  switch (항목.kind) {
    case 'APPLY':
      (p.pick === 'REJECT' ? 준.반려 : 준.반영).push({ key: p.key, rootId: 항목.rootId, runId: 항목.runId });
      return null;
    case 'FAIL': {
      if (p.pick === 'BUG') {
        준.버그.push({ key: p.key, runId: 항목.runId, tcId: 항목.tcId });
        return null;
      }
      const 칸 = await 화면이맞음채우기(서비스, 항목.runId, 항목.tcId);
      if ('error' in 칸) return 틀림(p.key);
      준.화면.push({ key: p.key, 칸 });
      return null;
    }
    case 'NOTE': {
      if (p.pick === 'BUG') {
        준.설명.push({ key: p.key, runId: 항목.runId, tcId: 항목.tcId, verdict: 'BUG' });
        return null;
      }
      // 고칠 요구는 덮는 요구의 차례(option), 안 보내면 첫째. 문장이 그대로면 고친 것이 없다
      const 차례 = p.option === undefined ? 0 : p.option;
      const 요구 = typeof 차례 === 'number' && Number.isInteger(차례) ? 항목.reqs[차례] : undefined;
      const text = 요구문장(p.text);
      // 같은 요구를 다른 고르기가 이미 고쳤으면 한 버전에 둘을 못 담는다 — 낡음이 아니라 이 항목이 틀렸다고 알린다
      if (요구 === undefined || text === null || text === 요구.text || 준.확인.some((x) => x.결정.reqId === 요구.reqId)) return 틀림(p.key);
      준.확인.push({ key: p.key, 결정: { reqId: 요구.reqId, pick: 'NOTE', text, tcId: 항목.tcId } });
      준.설명.push({ key: p.key, runId: 항목.runId, tcId: 항목.tcId, verdict: 'RULE' });
      return null;
    }
    case 'CHECK': {
      if (p.pick === 'SAME') 준.확인.push({ key: p.key, 결정: { reqId: 항목.reqId, pick: 'SAME' } });
      else if (p.pick === 'PICK') {
        const 고른 = typeof p.option === 'number' && Number.isInteger(p.option) ? 항목.options[p.option] : undefined;
        // 근거 원문은 2000자까지라 요구 문장 상한을 넘을 수 있다 — 자르면 사람이 고른 원문이 아니다
        if (고른 === undefined || 고른.quote.length > 상한.요구문장) return 틀림(p.key);
        준.확인.push({ key: p.key, 결정: { reqId: 항목.reqId, pick: 'PICK', text: 고른.quote, asset: 고른.asset } });
      } else {
        const text = 요구문장(p.text);
        if (text === null) return 틀림(p.key);
        준.확인.push({ key: p.key, 결정: { reqId: 항목.reqId, pick: p.pick as 'EDIT' | 'OWN', text } });
      }
      return null;
    }
    case 'PRD_CHANGED':
      준.요구다시 = p.key;
      return null;
    case 'API_CHANGED': {
      const 준비 = await 다시작성준비하기({ 서비스, from: 항목.fromVersion, to: 항목.toVersion, env: p.env });
      if ('error' in 준비) return 준비.error === 'BAD_ENV' || 준비.error === 'NOTHING_TO_APPLY' ? 틀림(p.key) : 낡음;
      준.API = { key: p.key, 준비 };
      return null;
    }
    case 'SCREENS': {
      const 이음 = await 최근대조(서비스);
      const env = p.env ?? 항목.env;
      if (p.env !== undefined) {
        const 판정 = await 역방향칸판정({ compare: true, env: p.env }, 서비스);
        if ('error' in 판정) return 틀림(p.key);
      }
      if (typeof env !== 'string') return 틀림(p.key);
      // 고른 화면은 목록에 있는 틀이고 하나 이상 · 겹침 없음. 안 보내면 모두다(이전 버전 화면과 같다)
      const 틀들 = [...new Set((항목.screens ?? []).map((x) => x.url))];
      const 고른 = p.screens;
      if (고른 !== undefined && (!Array.isArray(고른) || 고른.length === 0 || new Set(고른).size !== 고른.length || !고른.every((u) => typeof u === 'string' && 틀들.includes(u)))) return 틀림(p.key);
      const skip = 고른 === undefined ? [] : 틀들.filter((u) => !(고른 as string[]).includes(u));
      준.보완 = { key: p.key, env, startUrl: 이음?.env === env ? 이음.startUrl : null, skip };
      return null;
    }
    case 'PRD_DRAFT': {
      if (p.pick === 'DROP' || p.pick === 'RETRY') {
        준.초안끝.push({ key: p.key, requestId: 항목.requestId, pick: p.pick, done: 항목.state === 'DONE' });
        return null;
      }
      if (p.pick !== 'TAKE') return 틀림(p.key);
      // 고른 줄 차례 번호 — 겹침 · 범위 밖 · 그 사이 지워진 요구를 고친 줄은 거절한다(사람이 못 고르게 화면이 막는 줄이다)
      const rows = p.rows;
      if (!Array.isArray(rows) || rows.length === 0 || new Set(rows).size !== rows.length) return 틀림(p.key);
      if (!rows.every((i) => Number.isInteger(i) && 항목.rows[i as number]?.gone === false)) return 틀림(p.key);
      준.초안.push({ key: p.key, card: 항목, rows: rows as number[] });
      return null;
    }
    default:
      return 틀림(p.key);
  }
}
