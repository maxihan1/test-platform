// 설정 › BTS 연결의 [저장하고 BTS 자동 설정] — 누른 사람의 통합계정 토큰으로 BTS 에 웹훅 · 자동화 규칙 둘 · 보드 「QA 검토」 칸을 만든다 (도메인/BTS §7 「BTS 자동 설정」 · BTS-F3-05)
// 사람이 값을 옮겨 적지 않게 한다(2026-10-31 사용자 「자동으로 설정하면 되잖아」 · 「통합계정이잖아」). 다시 눌러도 두 벌 만들지 않는다 — 웹훅은 주소, 규칙은 이름으로 찾아 고친다

import type { Pool } from 'pg';

import { BTS고를목록 } from './choices.js';
import { BTS부르기, type BTS자리, type 부르기함수 } from './client.js';
import { BTS열쇠만들기 } from './link.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 설정항목 = 'WEBHOOK' | 'RULE_ASSIGNEE' | 'RULE_PR' | 'BOARD';

/** status 는 BTS 가 준 상태 코드 — 0 은 닿지 않음. 화면이 403 을 「권한 없음」으로 읽는다 */
export interface 설정결과 {
  what: 설정항목;
  ok: boolean;
  status?: number;
}

interface 연결 {
  bts_project: string;
  base_url: string;
  webhook_secret: string;
  status_map: { QA_REVIEW?: string };
}

// 이 이름으로 다시 찾는다 — 사람이 BTS 에서 이름을 바꾸면 새로 하나 만든다
const 규칙이름 = { RULE_ASSIGNEE: 'QA Hub · 담당자 변경', RULE_PR: 'QA Hub · PR 병합' } as const;

// 담당자 · PR 제목은 싣지 않는다 — 담당자 변경 사건엔 새 담당자가 없고, 템플릿이 따옴표를 그대로 끼워 제목에 「"」가 들면 몸이 깨진다(inbound.ts 규칙몸)
const 규칙몸 = {
  RULE_ASSIGNEE: { triggerType: 'ISSUE_ASSIGNED', body: '{"event":"ASSIGNEE","issueKey":"{{ issue.key }}"}' },
  RULE_PR: { triggerType: 'PR_MERGED', body: '{"event":"PR_MERGED","issueKey":"{{ issue.key }}","prNumber":"{{ issue.pr.number }}","prUrl":"{{ issue.pr.url }}"}' },
} as const;

const 됐나 = (status: number) => status === 200 || status === 201;

/** 하나가 깨져도 나머지는 해 둔다 — 화면은 막힌 것만 ✕ 로 보인다. 닿지 않으면 status 0 */
async function 해본다(what: 설정항목, 일: () => Promise<number>): Promise<설정결과> {
  try {
    const status = await 일();
    return 됐나(status) ? { what, ok: true } : { what, ok: false, status };
  } catch (err) {
    console.error(`[bts] 자동 설정 ${what} 이 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
    return { what, ok: false, status: 0 };
  }
}

/** BTS 시스템 관리자만 된다. 목록에 프로젝트 거르기가 없어 쪽마다 읽는다 */
// ponytail: 웹훅 2,000개(20쪽)까지만 훑는다. 넘는 설치가 생기면 BTS 에 주소 거르기를 더한다
async function 웹훅(자리: BTS자리, 부르기: 부르기함수, 줄: 연결, 주소: string): Promise<number> {
  let 있던: { id: string; version: number } | undefined;
  for (let 쪽 = 0; 쪽 < 20 && 있던 === undefined; 쪽 += 1) {
    const r = await 부르기(자리, 'GET', `/api/v1/webhooks?page=${쪽}&size=100`);
    if (r.status !== 200) return r.status;
    const 목록 = Array.isArray(r.json) ? (r.json as { id: string; url: string; version: number }[]) : [];
    있던 = 목록.find((w) => w.url === 주소);
    if (목록.length < 100) break;
  }
  const 몸 = { name: `QA Hub · ${줄.bts_project}`, url: 주소, eventFilter: ['issue.created', 'issue.transitioned'], secret: 줄.webhook_secret, projectKey: 줄.bts_project, enabled: true };
  return 있던 === undefined
    ? (await 부르기(자리, 'POST', '/api/v1/webhooks', 몸)).status
    : (await 부르기(자리, 'PUT', `/api/v1/webhooks/${encodeURIComponent(있던.id)}`, { ...몸, version: 있던.version })).status;
}

/**
 * 규칙 둘. 머리의 규칙 토큰(btr_)은 원문을 안 두므로 고칠 때마다 새로 만든다 — 앞 토큰은 끊긴다.
 * 그래서 규칙 목록을 읽은 뒤에만 만든다. 권한이 없어 못 고치는데 토큰만 바꾸면 이미 있던 규칙이 멈춘다
 */
async function 규칙들(자리: BTS자리, 부르기: 부르기함수, 줄: 연결, projectId: number, 누가: string, 바탕: string): Promise<설정결과[]> {
  const 경로 = `/api/v1/projects/${encodeURIComponent(줄.bts_project)}/automation/rules`;
  let 목록: { id: string; name: string; version: number }[];
  try {
    const r = await 부르기(자리, 'GET', 경로);
    if (r.status !== 200) return (['RULE_ASSIGNEE', 'RULE_PR'] as const).map((what) => ({ what, ok: false, status: r.status }));
    목록 = Array.isArray(r.json) ? (r.json as typeof 목록) : [];
  } catch (err) {
    console.error(`[bts] 자동 설정 규칙 목록이 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
    return (['RULE_ASSIGNEE', 'RULE_PR'] as const).map((what) => ({ what, ok: false, status: 0 }));
  }
  // ponytail: 토큰을 바꾼 뒤 규칙 하나만 깨지면 그 규칙은 옛 토큰을 들고 멈춘다 — 화면이 그 줄을 ✕ 로 보이고 다시 누르면 둘 다 새 토큰으로 고친다.
  // 원문을 안 두는 한 바꾸지 않고 고칠 길이 없다. 잦으면 토큰을 암호화해 두고 고칠 때 같은 것을 다시 넣는다
  const 토큰 = await BTS열쇠만들기(projectId, 'rule', 누가);
  // 그 사이 다른 운영자가 연결을 끊었다 — 500 으로 웹훅 · 보드 결과까지 잃지 않게 이 둘만 실패로 돌린다(리뷰)
  if (typeof 토큰 === 'string') return (['RULE_ASSIGNEE', 'RULE_PR'] as const).map((what) => ({ what, ok: false, status: 409 }));
  return Promise.all(
    (['RULE_ASSIGNEE', 'RULE_PR'] as const).map((what) =>
      해본다(what, async () => {
        const config = JSON.stringify({
          url: `${바탕}/api/bts/rules`,
          method: 'POST',
          headers: { 'X-QAHub-Token': 토큰.열쇠, 'Content-Type': 'application/json' },
          body: 규칙몸[what].body,
        });
        const actions = [{ type: 'CALL_WEBHOOK', config }];
        const 있던 = 목록.find((it) => it.name === 규칙이름[what]);
        return 있던 === undefined
          ? (await 부르기(자리, 'POST', 경로, { name: 규칙이름[what], triggerType: 규칙몸[what].triggerType, triggerConfig: '{}', actions })).status
          : (await 부르기(자리, 'PATCH', `${경로}/${encodeURIComponent(있던.id)}`, { version: 있던.version, enabled: true, actions })).status;
      }),
    ),
  );
}

interface 보드칸 {
  columnId: string;
  states: { key: string }[];
}

/** 그 프로젝트 보드마다 「QA 검토」 상태가 든 칸이 없으면 하나 만든다. 이미 어느 칸에 있으면 그대로 둔다(옮기면 남의 보드 짜임이 바뀐다) */
async function 보드(자리: BTS자리, 부르기: 부르기함수, 줄: 연결): Promise<number> {
  const 검토 = 줄.status_map.QA_REVIEW ?? '';
  let 칸이름: string | undefined;
  const r = await 부르기(자리, 'GET', `/api/v1/boards?projectKey=${encodeURIComponent(줄.bts_project)}`);
  if (r.status !== 200) return r.status;
  const 보드들 = ((r.json as { data?: { boardId: string }[] } | null)?.data ?? []).map((b) => b.boardId);
  // 보드가 없으면 만든 칸도 없다 — ✓ 로 보이지 않게 404 로 돌린다(화면 「보드 없음」)
  if (보드들.length === 0) return 404;
  for (const 번호 of 보드들) {
    const 상세 = await 부르기(자리, 'GET', `/api/v1/boards/${encodeURIComponent(번호)}`);
    if (상세.status !== 200) return 상세.status;
    const 칸들 = (상세.json as { data?: { columns?: 보드칸[] } } | null)?.data?.columns ?? [];
    if (칸들.some((칸) => 칸.states.some((s) => s.key === 검토))) continue;
    // 새 칸 이름은 그 상태의 보이는 이름 — 못 읽으면 키를 쓴다
    칸이름 ??= (await BTS고를목록(자리, 부르기))?.statuses.find((it) => it.key === 검토)?.name ?? 검토;
    const 만듦 = await 부르기(자리, 'POST', `/api/v1/boards/${encodeURIComponent(번호)}/columns`, { name: 칸이름, stateKeys: [검토] });
    if (!됐나(만듦.status)) return 만듦.status;
  }
  return 200;
}

/**
 * @param 사람토큰 누른 사람의 통합계정 토큰(app_user.farm_token). 웹훅은 BTS 시스템 관리자, 규칙은 그 프로젝트 자동화 관리, 보드 칸은 만들기 권한이 든다
 * @param 바탕 BTS 가 부를 QA Hub 공개 주소 — BTS 는 사설 주소 · localhost 를 거절한다
 */
export async function BTS자동설정(
  projectId: number,
  누가: string,
  사람토큰: string,
  바탕: string,
  부르기: 부르기함수 = BTS부르기,
): Promise<설정결과[] | 'NOT_LINKED'> {
  const 줄 = (await (await db()).query<연결>('SELECT bts_project, base_url, webhook_secret, status_map FROM bts_link WHERE project_id = $1', [projectId])).rows[0];
  if (줄 === undefined) return 'NOT_LINKED';
  const 자리 = { baseUrl: 줄.base_url, botKey: 사람토큰 };
  const [웹훅결과, 규칙결과, 보드결과] = await Promise.all([
    해본다('WEBHOOK', () => 웹훅(자리, 부르기, 줄, `${바탕}/api/bts/events/${projectId}`)),
    규칙들(자리, 부르기, 줄, projectId, 누가, 바탕),
    해본다('BOARD', () => 보드(자리, 부르기, 줄)),
  ]);
  return [웹훅결과, ...규칙결과, 보드결과];
}
