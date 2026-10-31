// PRD 초안 — 배포가 맡은 task · 스토리로 애플리케이션마다 PRD_DRAFT 를 세우고, 작성 에이전트가 낸 초안 줄의 꼴을 본다 (도메인/BTS §3.12 「PRD 초안 → 결정 필요」 · §7)

import type { Pool, PoolClient } from 'pg';

import { 상한 } from '../prd/rules.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 그 배포의 애플리케이션마다 PRD_DRAFT 하나 — 대상 서버는 그 배포가 그 애플리케이션에 건 실행의 서버다(스모크가 돈 서버).
 * 실행이 없는 애플리케이션(활성 케이스가 아직 없는 새 애플리케이션)은 배포 신호가 env 없이 고르는 규칙대로 실서비스 아닌 줄이 하나면 그 줄이다.
 * 그마저 못 고르면 건너뛰고 기록을 남긴다 — 그 애플리케이션 초안은 다음 배포 · 사람이 정한다. 「누가」는 BTS 연결을 마지막으로 저장한 admin(새 기능 바퀴 7).
 * bts_claim.request_id 는 채우지 않는다 — 애플리케이션마다 줄이 서서 한 칸에 못 담는다. 초안은 params.issueKeys 로 찾는다(BTS-F5-03 시작 질문 7)
 */
export async function 초안세우기(deployId: number, 키들: string[], 손?: PoolClient, 제목들: Record<string, string> = {}): Promise<number[]> {
  if (키들.length === 0) return [];
  const r = await (손 ?? (await db())).query<{ id: string }>(
    `INSERT INTO authoring_request (service_id, kind, params, env, requested_by, requested_by_name, status)
     SELECT s.id, 'PRD_DRAFT', jsonb_build_object('issueKeys', to_jsonb($2::text[]), 'deployId', d.id, 'buildNo', d.build_no, 'titles', $3::jsonb), 실행.env,
            l.updated_by, 'BTS · ' || COALESCE(u.display_name, l.updated_by), 'PENDING'
       FROM bts_deploy d
       JOIN bts_link l ON l.project_id = d.project_id
       JOIN service s ON s.id = ANY(d.service_ids)
       JOIN LATERAL (SELECT COALESCE(
              (SELECT t.env FROM test_run t WHERE t.run_id = ANY(d.run_ids) AND t.service_id = s.id ORDER BY t.run_id LIMIT 1),
              (SELECT min(e.env) FROM service_env e WHERE e.service_id = s.id AND NOT e.is_prod HAVING count(*) = 1)) AS env) 실행 ON 실행.env IS NOT NULL
       LEFT JOIN app_user u ON u.username = l.updated_by
      WHERE d.id = $1
      ORDER BY s.id
     RETURNING id`,
    [deployId, 키들, JSON.stringify(Object.fromEntries(키들.flatMap((k) => (제목들[k] === undefined ? [] : [[k, 제목들[k]]]))))],
  );
  const 번호들 = r.rows.map((x) => Number(x.id));
  if (번호들.length === 0) console.error(`[bts] 배포 ${String(deployId)} 의 PRD 초안을 세울 애플리케이션이 없다 — 대상 서버를 못 골랐다 (${키들.join(', ')})`);
  return 번호들;
}

/**
 * 에이전트가 꺼져 멈춘 초안은 같은 칸으로 새로 세운다 — AI 탓이 아니라 끝없이 돌지 않는다(노트 고치기와 같은 판단).
 * 이어하기(RERUN)로 잇지 않는다 — 초안은 작업 폴더에 남길 것이 없다. 멈춘 줄은 폐기로 찍는다 — 같은 이슈 키의 살아 있는 초안이 하나만 남게
 */
export async function 초안다시세우기(id: number, 손?: PoolClient, 상태들?: string[]): Promise<number | null> {
  // 카드의 [다시 만들기]는 실패 · 멈춘 줄만 받는다 — 그 사이 다시 세워 도는 줄을 또 세우지 않게(BTS-F5-04)
  const r = await (손 ?? (await db())).query<{ id: string }>(
    `WITH 옛 AS (
       UPDATE authoring_request SET discarded_at = now() WHERE id = $1 AND kind = 'PRD_DRAFT' AND discarded_at IS NULL AND ($2::text[] IS NULL OR status = ANY($2))
       RETURNING service_id, kind, params, env, requested_by, requested_by_name
     )
     INSERT INTO authoring_request (service_id, kind, params, env, requested_by, requested_by_name, status)
     SELECT service_id, kind, params, env, requested_by, requested_by_name, 'PENDING' FROM 옛
     RETURNING id`,
    [id, 상태들 ?? null],
  );
  return r.rows[0] === undefined ? null : Number(r.rows[0].id);
}

// 줄 · 글 상한 — 이 위는 AI 가 잘못 쓴 것으로 본다. 카드 하나가 사람이 줄마다 고를 만한 크기여야 한다
export const 초안상한 = { 줄: 200, 글: 2000, e2e: 20, 단계: 30 } as const;
/** 결과 통로 몸 상한(바이트) — 위 상한을 다 채운 초안보다 넉넉하다. 에이전트 출력 파일 상한과 같다 */
export const 초안몸상한 = 4 * 1024 * 1024;

export interface 초안줄 {
  op: 'ADD' | 'EDIT' | 'DEL';
  reqId?: string;
  text: string;
  basis: string;
  issueKeys: string[];
  sure: boolean;
}
export interface 초안E2E {
  title: string;
  services: string[];
  steps: string[];
  issueKeys: string[];
}
export interface 초안 {
  rows: 초안줄[];
  e2e?: 초안E2E[];
}

type 판정 = { ok: true; 초안: 초안 } | { ok: false; error: 'BAD_DRAFT'; detail: string };

const 글인가 = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '' && x.length <= 초안상한.글;
const 글목록인가 = (x: unknown, 상한: number): x is string[] => Array.isArray(x) && x.length > 0 && x.length <= 상한 && x.every(글인가);

/**
 * 초안 몸을 본다. 바뀜 · 지움은 지금 PRD 에 있는 번호여야 하고, 같은 번호를 두 줄이 건드리면 거절한다 —
 * 같은 요구를 건드리는 이슈는 AI 가 한 줄로 합쳐야 한다(「한 카드로」 · 시작 질문 3). 이슈 키는 그 요청이 맡은 것만
 */
export function 초안검사(몸: unknown, 맡은키: ReadonlySet<string>, 요구번호: ReadonlySet<string>, 접두사들: ReadonlySet<string>): 판정 {
  const 틀림 = (detail: string): 판정 => ({ ok: false, error: 'BAD_DRAFT', detail });
  const b = 몸 as { rows?: unknown; e2e?: unknown } | null;
  if (b === null || typeof b !== 'object' || !Array.isArray(b.rows)) return 틀림('rows');
  if (Object.keys(b).some((k) => k !== 'rows' && k !== 'e2e')) return 틀림('body');
  if (b.rows.length > 초안상한.줄) return 틀림('rows.length');
  const 키맞나 = (x: unknown): x is string[] => 글목록인가(x, 맡은키.size) && new Set(x).size === x.length && x.every((k) => 맡은키.has(k));
  const rows: 초안줄[] = [];
  const 본번호 = new Set<string>();
  for (const [i, raw] of (b.rows as unknown[]).entries()) {
    const r = raw as Partial<Record<keyof 초안줄, unknown>> | null;
    if (r === null || typeof r !== 'object') return 틀림(`rows.${i}`);
    if (r.op !== 'ADD' && r.op !== 'EDIT' && r.op !== 'DEL') return 틀림(`rows.${i}.op`);
    if (r.op === 'ADD' ? r.reqId !== undefined : !(typeof r.reqId === 'string' && 요구번호.has(r.reqId))) return 틀림(`rows.${i}.reqId`);
    if (typeof r.reqId === 'string') {
      if (본번호.has(r.reqId)) return 틀림(`rows.${i}.reqId 겹침`);
      본번호.add(r.reqId);
    }
    // 문장은 골라서 그대로 기획서 요구 문장이 된다 — PRD 요구 문장 상한을 넘으면 카드에서 못 고른다(BTS-F5-04)
    if (!글인가(r.text) || r.text.length > 상한.요구문장) return 틀림(`rows.${i}.text`);
    if (!글인가(r.basis)) return 틀림(`rows.${i}.basis`);
    if (!키맞나(r.issueKeys)) return 틀림(`rows.${i}.issueKeys`);
    if (typeof r.sure !== 'boolean') return 틀림(`rows.${i}.sure`);
    rows.push({ op: r.op, ...(typeof r.reqId === 'string' && { reqId: r.reqId }), text: r.text, basis: r.basis, issueKeys: r.issueKeys, sure: r.sure });
  }
  if (b.e2e === undefined) return { ok: true, 초안: { rows } };
  if (!Array.isArray(b.e2e) || b.e2e.length > 초안상한.e2e) return 틀림('e2e');
  const e2e: 초안E2E[] = [];
  for (const [i, raw] of (b.e2e as unknown[]).entries()) {
    const e = raw as Partial<Record<keyof 초안E2E, unknown>> | null;
    if (e === null || typeof e !== 'object' || !글인가(e.title)) return 틀림(`e2e.${i}.title`);
    // 다른 애플리케이션과 엮일 때만 제안한다 — 그 프로젝트 애플리케이션 둘 이상
    if (!글목록인가(e.services, 접두사들.size) || new Set(e.services).size < 2 || !e.services.every((p) => 접두사들.has(p))) return 틀림(`e2e.${i}.services`);
    if (!글목록인가(e.steps, 초안상한.단계)) return 틀림(`e2e.${i}.steps`);
    if (!키맞나(e.issueKeys)) return 틀림(`e2e.${i}.issueKeys`);
    e2e.push({ title: e.title, services: e.services, steps: e.steps, issueKeys: e.issueKeys });
  }
  return { ok: true, 초안: { rows, e2e } };
}

/** result.draft 가 실렸나 — 끝내기가 초안 없는 DONE 을 막는다 */
export function 초안있나(result: unknown): boolean {
  const d = (result as { draft?: { rows?: unknown } } | null)?.draft;
  return Array.isArray(d?.rows);
}

export interface 초안집기 {
  projectId: number;
  /** 같은 프로젝트의 애플리케이션 — 자식이 E2E 제안에 접두사를 고른다 */
  services: { prefix: string; name: string; kind: string }[];
  issueKeys: string[];
  buildNo: string;
}

/** 집기 응답의 draft 칸 — 프로젝트 번호 · 그 프로젝트 애플리케이션 · 맡은 이슈 · 배포 빌드 */
export async function 초안집기칸(서비스: number, params: Record<string, unknown>): Promise<초안집기> {
  const r = await (await db()).query<{ project_id: string; prefix: string; name: string; kind: string }>(
    `SELECT s.project_id, s.prefix, s.name, s.kind FROM service s
      WHERE s.project_id = (SELECT project_id FROM service WHERE id = $1) ORDER BY s.prefix`,
    [서비스],
  );
  return {
    projectId: Number(r.rows[0]!.project_id),
    services: r.rows.map(({ prefix, name, kind }) => ({ prefix, name, kind })),
    issueKeys: 맡은키들(params),
    buildNo: typeof params.buildNo === 'string' ? params.buildNo : '',
  };
}

/** params 의 맡은 이슈 키 — 서버가 세운 칸이라 꼴이 늘 맞지만 옛 줄 · 손댄 줄은 빈 목록으로 */
export function 맡은키들(params: Record<string, unknown>): string[] {
  const 키 = params.issueKeys;
  return Array.isArray(키) ? 키.filter((k): k is string => typeof k === 'string') : [];
}
