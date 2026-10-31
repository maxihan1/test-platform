// 결정 필요 「PRD 초안」 카드 — 끝난 · 실패한 · 멈춘 초안을 카드로 싣고, 사람이 고른 줄을 기획서 결정 판에 넣는 규칙과 진행 뒤 기록 (도메인/BTS 「PRD 초안 → 결정 필요」 · BTS-F5-04)

import type { PoolClient } from 'pg';
import type { PrdItem } from '@platform/kit';

import type { 판변경 } from '../prd/changes.js';
import { 상한 } from '../prd/rules.js';
import { 초안다시세우기, type 초안E2E, type 초안줄 } from './draft.js';

/** 카드의 줄 하나 — 초안 줄에 지금 판의 문장을 붙인다. 수정 · 삭제 줄의 번호가 지금 판에 없으면 gone(그 사이 사람이 지웠다) */
export type 초안카드줄 = 초안줄 & { oldText: string | null; gone: boolean };

export interface 초안카드 {
  requestId: number;
  state: 'DONE' | 'FAILED' | 'STOPPED';
  /** 실패면 에이전트가 남긴 오류 글, 멈춤이면 중단 사유 코드 */
  reason: string | null;
  buildNo: string;
  finishedAt: string | null;
  issues: { key: string; title: string | null; url: string | null }[];
  rows: 초안카드줄[];
  e2e: 초안E2E[];
}

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface 초안행 {
  id: string;
  status: 'DONE' | 'FAILED' | 'STOPPED';
  params: Record<string, unknown>;
  result: { draft?: { rows?: 초안줄[]; e2e?: 초안E2E[] } } | null;
  error: string | null;
  stop_reason: string | null;
  finished_at: Date | null;
  base_url: string | null;
}

/**
 * 사람이 고를 초안 — 끝났고 아직 안 고른 것 · 실패 · 멈춤(에이전트가 꺼져 멈춘 것은 새로 서고 옛 줄은 폐기라 여기 안 온다).
 * 도는 · 기다리는 초안은 고를 것이 없어 안 싣는다
 */
export async function 초안카드들(서비스: number, 판: PrdItem[]): Promise<초안카드[]> {
  const r = await (await db()).query<초안행>(
    `SELECT q.id, q.status, q.params, q.result, q.error, q.stop_reason, q.finished_at, l.base_url
       FROM authoring_request q
       JOIN service s ON s.id = q.service_id
       LEFT JOIN bts_link l ON l.project_id = s.project_id
      WHERE q.service_id = $1 AND q.kind = 'PRD_DRAFT' AND q.discarded_at IS NULL
        AND (q.status IN ('FAILED', 'STOPPED') OR (q.status = 'DONE' AND NOT COALESCE(q.result ? 'picked', false)))
      ORDER BY q.id`,
    [서비스],
  );
  const 지금 = new Map(판.map((x) => [x.reqId, x.text]));
  return r.rows.map((x): 초안카드 => {
    const 제목 = (x.params.titles ?? {}) as Record<string, unknown>;
    const 키들 = Array.isArray(x.params.issueKeys) ? x.params.issueKeys.filter((k): k is string => typeof k === 'string') : [];
    const 주소 = x.base_url?.replace(/\/+$/, '') ?? null;
    return {
      requestId: Number(x.id),
      state: x.status,
      reason: x.status === 'FAILED' ? x.error : x.status === 'STOPPED' ? x.stop_reason : null,
      buildNo: typeof x.params.buildNo === 'string' ? x.params.buildNo : '',
      finishedAt: x.finished_at?.toISOString() ?? null,
      issues: 키들.map((key) => ({ key, title: typeof 제목[key] === 'string' ? 제목[key] : null, url: 주소 === null ? null : `${주소}/issues/${encodeURIComponent(key)}` })),
      rows: (x.result?.draft?.rows ?? []).map((줄) => {
        const old = 줄.reqId === undefined ? null : (지금.get(줄.reqId) ?? null);
        return { ...줄, oldText: old, gone: 줄.op !== 'ADD' && old === null };
      }),
      e2e: x.result?.draft?.e2e ?? [],
    };
  });
}

export interface 고른초안 {
  key: string;
  card: 초안카드;
  /** 체크한 줄 차례 번호 */
  picked: ReadonlySet<number>;
}

type 적용결과 = { items: PrdItem[]; lastNo: number; changes: 판변경[]; 바뀜: boolean } | { error: 'BAD_PICK'; detail: string };

const 합친키 = (앞: string[] | undefined, 뒤: string[]) => [...new Set([...(앞 ?? []), ...뒤])];

/**
 * 고른 초안들을 판에 차례로 넣는다. 체크한 줄은 확정으로 들어가고(추가 · 수정 · 삭제),
 * 체크 안 한 「화면만 보고 적음」(sure: false) 줄은 버리지 않고 확인 필요로 남긴다 — 삭제 줄이면 요구는 그대로 두고 확인 필요만 단다.
 * 체크 안 한 확정 후보는 버린다. 체크한 수정 · 삭제 줄의 번호가 없으면(앞 초안이나 사람이 지웠다) BAD_PICK
 */
export function 초안적용(지금: PrdItem[], lastNo: number, 접두사: string, 초안들: 고른초안[], 시각: string): 적용결과 {
  const 판 = new Map(지금.map((x) => [x.reqId, x]));
  const changes: 판변경[] = [];
  let 마지막 = lastNo;
  for (const { key, card, picked } of 초안들) {
    const 제목 = new Map(card.issues.map((i) => [i.key, i.title]));
    for (const [i, 줄] of card.rows.entries()) {
      const 고름 = picked.has(i);
      if (!고름 && 줄.sure) continue;
      const 근거 = { from: 줄.issueKeys.join(' · '), quote: 줄.basis.slice(0, 상한.근거문장) };
      const 바뀜 = (kind: 판변경['kind'], reqId: string, text: string | null) => changes.push({ kind, reqId, text, asset: null, tcId: null, issueKeys: 줄.issueKeys });
      if (줄.op === 'ADD') {
        마지막 += 1;
        if (마지막 > 상한.항목) return { error: 'BAD_PICK', detail: key };
        const reqId = `${접두사}-REQ-${String(마지막).padStart(3, '0')}`;
        // 기능 이름은 이슈 제목 — 사람이 PRD 관리에서 고친다(시작 질문)
        const feature = (제목.get(줄.issueKeys[0]!) ?? 줄.issueKeys[0]!).slice(0, 상한.근거자리);
        판.set(reqId, { reqId, feature, text: 줄.text, basis: [근거], status: 고름 ? 'CONFIRMED' : 'NEEDS_CHECK', ...(고름 ? {} : { checkSince: 시각 }), byPerson: true, fromIssues: 줄.issueKeys });
        바뀜('ADD', reqId, 줄.text);
        continue;
      }
      const 앞것 = 판.get(줄.reqId!);
      if (앞것 === undefined) {
        if (고름) return { error: 'BAD_PICK', detail: key };
        continue;
      }
      const { checkSince: 앞때, ...나머지 } = 앞것;
      const 꼬리표 = { byPerson: true as const, fromIssues: 합친키(앞것.fromIssues, 줄.issueKeys) };
      const 확인 = { status: 'NEEDS_CHECK' as const, checkSince: 앞것.status === 'NEEDS_CHECK' && 앞때 !== undefined ? 앞때 : 시각 };
      if (줄.op === 'DEL') {
        if (고름) {
          판.delete(줄.reqId!);
          바뀜('DEL', 줄.reqId!, null);
        } else {
          판.set(줄.reqId!, { ...나머지, ...확인, ...꼬리표 });
          바뀜('CHECK', 줄.reqId!, null);
        }
        continue;
      }
      const basis = [근거, ...앞것.basis].slice(0, 상한.근거);
      판.set(줄.reqId!, 고름 ? { ...나머지, text: 줄.text, basis, status: 'CONFIRMED', ...꼬리표 } : { ...나머지, text: 줄.text, basis, ...확인, ...꼬리표 });
      바뀜('EDIT', 줄.reqId!, 줄.text);
    }
  }
  const items = [...판.values()].sort((a, b) => a.reqId.localeCompare(b.reqId));
  return { items, lastNo: 마지막, changes, 바뀜: changes.length > 0 };
}

/** 진행한 초안에 고른 줄을 남긴다(대시보드 「초안 AI」 셈 — BTS-F8-01). 그 사이 다른 사람이 진행했으면 false */
export async function 초안고름남기기(손: PoolClient, requestId: number, rows: number[], 누가: string, version: number | null): Promise<boolean> {
  const r = await 손.query(
    `UPDATE authoring_request SET result = jsonb_set(result, '{picked}', $2::jsonb)
      WHERE id = $1 AND kind = 'PRD_DRAFT' AND status = 'DONE' AND discarded_at IS NULL AND NOT COALESCE(result ? 'picked', false)`,
    [requestId, JSON.stringify({ rows, by: 누가, at: new Date().toISOString(), version })],
  );
  return r.rowCount === 1;
}

/** 실패 · 멈춘 초안 버리기 — 폐기로 찍는다. 그 사이 다시 세웠으면 false */
export async function 초안버리기(손: PoolClient, requestId: number): Promise<boolean> {
  const r = await 손.query(
    `UPDATE authoring_request SET discarded_at = now() WHERE id = $1 AND kind = 'PRD_DRAFT' AND status IN ('FAILED', 'STOPPED') AND discarded_at IS NULL`,
    [requestId],
  );
  return r.rowCount === 1;
}

/** 실패 · 멈춘 초안을 같은 칸으로 다시 세운다. 그 사이 다시 세웠거나 버렸으면 null */
export const 초안다시만들기 = (손: PoolClient, requestId: number) => 초안다시세우기(requestId, 손, ['FAILED', 'STOPPED']);
