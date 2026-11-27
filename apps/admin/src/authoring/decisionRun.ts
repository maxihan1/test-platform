// 결정 진행 — 고른 것을 한 번에 받아 버그 → 기획서 새 버전 → 반영 → 고치기 · 다시 만들기 → 보완 차례로 한 트랜잭션에서 세운다 (작성 §3.6 「★ 결정 목록」 진행 · §7 「결정 목록 통로」 POST)

import type { PoolClient } from 'pg';
import type { PrdItem } from '@platform/kit';

import { 다시작성넣기 } from '../apidoc/rewrite.js';
import { 초안고름남기기, 초안다시만들기, 초안버리기, 초안적용 } from '../bts/draftDecide.js';
import { BTS이은서비스인가 } from '../bts/link.js';
import type { 판변경 } from '../prd/changes.js';
import { 결정판넣기, 서비스접두사, 잠그고, 지금판, type 저장하는사람 } from '../prd/store.js';
import { 버그남기기 } from '../reporting/failReqs.js';
import { 결정판 } from './decisionItems.js';
import type { 부른이 } from './decisions.js';
import { 낡음, 준비하기, 틀림, type 진행결과, type 진행단계 } from './decisionPrep.js';
import { 설명판정남기기 } from './decisionNotes.js';
import { 본문읽기 } from './decisionBody.js';
import { 머지세우기 } from './merge.js';
import { 열린작성 } from './openRoots.js';
import { 버리기 } from './stop.js';
import { 줄세우기, 한건 } from './store.js';


/** 트랜잭션 안에서 그만둘 때 던진다 — 잠그고 가 되돌리고, 바깥에서 결과로 바꾼다 */
class 되돌림 extends Error {
  constructor(readonly 결과: 진행결과) {
    super('결정 진행을 되돌렸다');
  }
}


/**
 * 반영 하나 — 보류 값을 넣었으면 그 실행의 대상 서버로 3회 돌린다(2026-10-26 시작 질문). 거절은 진행 전체를 되돌린다.
 * 행은 뿌리 잠금 안에서 다시 읽는다 — 고른 뒤 그 사이 폐기 · 보류 입력이 바뀌었으면 옛 모습으로 판정하게 된다
 */
async function 반영세우기(손: PoolClient, 서비스: number, runId: number, 사람: 저장하는사람, key: string): Promise<number> {
  const 행 = await 한건(runId, 손);
  if (행 === null || 행.serviceId !== 서비스) throw new 되돌림(낡음);
  let 판정 = await 머지세우기(손, 행, 서비스, undefined, 사람);
  if ('error' in 판정 && 판정.error === 'BAD_ENV' && !행.compare && 행.env !== null) 판정 = await 머지세우기(손, 행, 서비스, 행.env, 사람);
  if (!('error' in 판정)) return 판정.id;
  // 그 사이 재실행 · 폐기 · 반영이 끼었으면 사람이 본 것과 다르다
  throw new 되돌림(['RUN_ACTIVE', 'NOT_LATEST', 'BAD_SOURCE', 'NOT_MERGEABLE'].includes(판정.error) ? 낡음 : 틀림(key));
}

export async function 결정진행(서비스: number, 누구: 부른이, 사람: 저장하는사람, body: unknown): Promise<진행결과> {
  const 본문 = 본문읽기(body);
  if (본문 === null) return { code: 400, body: { error: 'INVALID_REQUEST' } };
  // BTS 를 이은 프로젝트는 판정을 BTS 에서만 한다 — 실패를 고르는 진행은 목록에 없다고 낡음으로 돌리지 않고 까닭을 밝힌다(도메인/BTS §7)
  if (본문.picks.some((p) => p.key.startsWith('fail:')) && (await BTS이은서비스인가(서비스))) return { code: 400, body: { error: 'BAD_DECISION' } };
  const 준 = await 준비하기(서비스, 누구, 본문);
  if ('code' in 준) return 준;
  const 지금것 = 준.확인.length + 준.초안.length === 0 ? null : await 지금판(서비스);
  const 확인판 = 준.확인.length === 0 ? null : 결정판(지금것?.items ?? [], 준.확인.map((x) => x.결정));
  if (준.확인.length > 0 && 확인판 === null) return 낡음;
  // PRD 초안의 고른 줄은 확인 필요 결정과 한 버전에 담는다 — 두 버전으로 나누면 다시 작성이 앞 버전을 기준으로 잡는다
  let 판: { items: PrdItem[]; changes: 판변경[]; 문장바뀜: boolean; lastNo?: number } | null = 확인판;
  if (준.초안.length > 0) {
    const 적용 = 초안적용(확인판?.items ?? 지금것?.items ?? [], 지금것?.lastNo ?? 0, await 서비스접두사(서비스), 준.초안.map((x) => ({ key: x.key, card: x.card, picked: new Set(x.rows) })), new Date().toISOString());
    if ('error' in 적용) return 틀림(적용.detail);
    판 = { items: 적용.items, changes: [...(확인판?.changes ?? []), ...적용.changes], 문장바뀜: (확인판?.문장바뀜 ?? false) || 적용.바뀜, lastNo: 적용.lastNo };
  }
  // TAKE 는 체크한 줄이 하나 이상이라 늘 판을 바꾼다(추가 · 수정 · 삭제)
  const 초안바뀜 = 준.초안.length > 0;
  const count = 본문.picks.length;
  try {
    return await 잠그고(서비스, async (손) => {
      // 고를 때 본 버전과 지금 버전이 다르면 아무것도 안 한다 — 두 사람이 같은 버전을 고쳐 한쪽이 조용히 사라지지 않게
      const 지금 = await 손.query<{ v: number }>('SELECT COALESCE(max(version), 0) AS v FROM prd_version WHERE service_id = $1', [서비스]);
      if (지금.rows[0]!.v !== 본문.prdVersion) throw new 되돌림(낡음);
      // 잠금 차례는 기획서 → 뿌리 → 열린 작성이다 — 재실행 · 제출(뿌리 → 열린 작성)과 엇갈려 서로 기다리지 않게
      for (const 뿌리 of [...new Set([...준.반영, ...준.반려].map((x) => x.rootId))].sort((a, b) => a - b)) {
        await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-root'), ($1::bigint % 2147483647)::int)`, [뿌리]);
      }
      const 열린 = await 열린작성(서비스, 손);
      // 요청을 세우는 진행은 열린 작성이 고를 때와 같아야 한다 — 두 번 누르면 둘째가 첫째가 세운 요청을 못 본 채 같은 요청을 또 세운다
      const 세우나 = 준.반영.length + 준.화면.length + (준.요구다시 === null ? 0 : 1) + (준.API === null ? 0 : 1) + (준.보완 === null ? 0 : 1) > 0 || 판?.문장바뀜 === true;
      if (세우나 && 열린.join() !== 준.열린.join()) throw new 되돌림(낡음);
      const steps: 진행단계[] = [];
      for (const b of 준.버그) {
        if ((await 버그남기기(b.runId, b.tcId, 사람, 손)) === 'NOT_FAILED') throw new 되돌림(틀림(b.key));
        steps.push({ step: 1, key: b.key, requestId: null, version: null });
      }
      for (const x of 준.설명) {
        if (!(await 설명판정남기기(손, x.runId, x.tcId, x.verdict, 사람))) throw new 되돌림(낡음);
        if (x.verdict === 'BUG') steps.push({ step: 1, key: x.key, requestId: null, version: null });
      }
      const version = 판 !== null && (준.확인.length > 0 || 초안바뀜) ? await 결정판넣기(손, 서비스, 판.items, 사람, 판.changes, 판.lastNo) : null;
      for (const x of [...준.확인, ...준.초안]) steps.push({ step: 2, key: x.key, requestId: null, version });
      for (const x of 준.초안) if (!(await 초안고름남기기(손, x.card.requestId, x.rows, 사람.username, version))) throw new 되돌림(낡음);
      for (const x of 준.반영) steps.push({ step: 3, key: x.key, requestId: await 반영세우기(손, 서비스, x.runId, 사람, x.key), version: null });
      // 그 사이 재실행 · 폐기가 끼었으면 사람이 본 것과 다르다
      for (const x of 준.반려) {
        if (!(await 버리기(x.runId, 손))) throw new 되돌림(낡음);
        steps.push({ step: 3, key: x.key, requestId: null, version: null });
      }
      // 뒤 요청은 그때 열린 작성 전부와 이번에 앞서 세운 요청 전부를 기다린다 — 한 번에 하나씩 돈다
      // 반려한 뿌리는 방금 폐기했다 — 뒤 요청이 기다릴 앞 일이 아니다
      const 앞것 = 열린.filter((id) => !준.반려.some((x) => x.rootId === id));
      const 결정 = () => ({ decision: { after: [...앞것], count } });
      // 문장이 바뀌었거나 화면이 맞음을 골랐으면 바뀐 요구도 같이 다시 만든다 — 기준 버전이 하나라 나눠 넣으면 병합 뒤 「반영 안 됨」이 틀어진다
      if (준.요구다시 !== null || 준.화면.length > 0 || 판?.문장바뀜 === true) {
        const 지금시각 = new Date().toISOString();
        const 화면칸 = 준.화면.map((x) => ({ ...x.칸, byName: 사람.displayName, at: 지금시각 }));
        const id = await 줄세우기(
          { 서비스, kind: 'AUTHOR', 기획서: null, 값: { prdApply: true, ...(화면칸.length > 0 ? { screenRight: 화면칸 } : {}), ...결정() }, 누가: 사람.username, 이름: 사람.displayName },
          손,
        );
        앞것.push(id);
        const 열쇠들 = [...(준.요구다시 === null ? [] : [준.요구다시]), ...준.화면.map((x) => x.key), ...(초안바뀜 ? 준.초안.map((x) => x.key) : [])];
        for (const key of 열쇠들.length > 0 ? 열쇠들 : [null]) steps.push({ step: 4, key, requestId: id, version: null });
      }
      if (준.API !== null) {
        const id = await 다시작성넣기(손, 준.API.준비, { 누가: 사람.username, 이름: 사람.displayName }, 결정());
        if (id === null) throw new 되돌림(낡음);
        앞것.push(id);
        steps.push({ step: 4, key: 준.API.key, requestId: id, version: null });
      }
      if (준.보완 !== null) {
        const id = await 줄세우기(
          { 서비스, kind: 'AUTHOR', 기획서: null, 값: { ...결정(), ...(준.보완.skip.length > 0 ? { skipScreens: 준.보완.skip } : {}) }, 누가: 사람.username, 이름: 사람.displayName, 대조: { env: 준.보완.env, startUrl: 준.보완.startUrl } },
          손,
        );
        앞것.push(id);
        steps.push({ step: 5, key: 준.보완.key, requestId: id, version: null });
      }
      for (const x of 준.초안끝) {
        if (x.pick === 'RETRY') {
          const id = await 초안다시만들기(손, x.requestId);
          if (id === null) throw new 되돌림(낡음);
          steps.push({ step: 6, key: x.key, requestId: id, version: null });
          continue;
        }
        if (!(x.done ? await 초안고름남기기(손, x.requestId, [], 사람.username, null) : await 초안버리기(손, x.requestId))) throw new 되돌림(낡음);
        steps.push({ step: 6, key: x.key, requestId: null, version: null });
      }
      return { code: 201 as const, body: { steps } };
    });
  } catch (err) {
    if (err instanceof 되돌림) return err.결과;
    throw err;
  }
}
