// 정기 실행 세트 표 읽기 · 쓰기와 줄 판정 재료 읽기 (도메인/정기실행 §3.16 · 공통/4-데이터모델 「정기 실행 표」)

import type { ScenarioPart } from '@platform/kit';

import { pool } from '../db/index.js';
import { 점검 } from '../scenario/checks.js';
import { 쓰는접두사 } from '../scenario/mixed.js';
import { 케이스재료 } from '../scenario/parts.js';
import type { 서버고름, 앱, 재료, 줄, 줄종류 } from './check.js';

export interface 세트 {
  id: number;
  projectId: number;
  name: string;
  at: string;
  tz: string;
  days: number[] | null;
  onceOn: string | null;
  isOn: boolean;
  isBase: boolean;
  줄들: 줄[];
  고름: 서버고름;
}

export interface 세트몸 {
  name: string;
  at: string;
  days: number[] | null;
  onceOn: string | null;
  줄들: 줄[];
  고름: 서버고름;
}

/** 프로젝트의 세트 전부, 또는 번호 하나. 이름 차례 */
export async function 세트들읽기(where: { projectId: number } | { id: number }): Promise<세트[]> {
  const 조건 = 'id' in where ? 's.id = $1' : 's.project_id = $1';
  const r = await pool.query<{
    id: string; project_id: string; name: string; at: string; tz: string; days: number[] | null; once_on: string | null; is_on: boolean; is_base: boolean;
    items: { kind: 줄종류; service_id: number; tc_ids: string[] | null; scenario_id: number | null; compat_set_id: number | null }[];
    envs: { service_id: number; env: string }[];
  }>(
    `SELECT s.id, s.project_id, s.name, to_char(s.at, 'HH24:MI') AS at, s.tz, s.days, to_char(s.once_on, 'YYYY-MM-DD') AS once_on, s.is_on, s.is_base,
            COALESCE((SELECT json_agg(json_build_object('kind', i.kind, 'service_id', i.service_id, 'tc_ids', i.tc_ids,
                                                        'scenario_id', i.scenario_id, 'compat_set_id', i.compat_set_id) ORDER BY i.seq)
                        FROM sched_set_item i WHERE i.set_id = s.id), '[]') AS items,
            COALESCE((SELECT json_agg(json_build_object('service_id', e.service_id, 'env', e.env)) FROM sched_set_env e WHERE e.set_id = s.id), '[]') AS envs
       FROM sched_set s WHERE ${조건} ORDER BY s.name, s.id`,
    ['id' in where ? where.id : where.projectId],
  );
  return r.rows.map((x) => ({
    id: Number(x.id),
    projectId: Number(x.project_id),
    name: x.name,
    at: x.at,
    tz: x.tz,
    days: x.days,
    onceOn: x.once_on,
    isOn: x.is_on,
    isBase: x.is_base,
    줄들: x.items.map((i) => ({ kind: i.kind, serviceId: Number(i.service_id), tcIds: i.tc_ids, scenarioId: i.scenario_id === null ? null : Number(i.scenario_id), compatSetId: i.compat_set_id === null ? null : Number(i.compat_set_id) })),
    고름: new Map(x.envs.map((e) => [Number(e.service_id), e.env])),
  }));
}

/**
 * 줄 판정 재료 — 프로젝트 애플리케이션과 줄이 가리키는 애플리케이션 · 시나리오 · 호환성 세트 · 고른 케이스.
 * 시나리오 실행 가능은 E2E 목록과 같은 점검으로 본다 (scenario/routes.ts)
 */
export async function 재료읽기(projectId: number, 줄들: readonly 줄[]): Promise<재료> {
  const 번호들 = (k: 'scenarioId' | 'compatSetId') => [...new Set(줄들.flatMap((x) => (x[k] === null ? [] : [x[k]])))];
  const [시, 호, 케] = await Promise.all([
    pool.query<{ id: string; service_id: string; is_active: boolean; name: string; parts: ScenarioPart[] }>(
      `SELECT sc.id, sc.service_id, sc.is_active, sc.name, v.parts FROM scenario sc
         JOIN LATERAL (SELECT parts FROM scenario_version WHERE scenario_id = sc.id ORDER BY version DESC LIMIT 1) v ON true
        WHERE sc.id = ANY($1::bigint[])`,
      [번호들('scenarioId')],
    ),
    pool.query<{ id: string; service_id: string; is_active: boolean; name: string }>('SELECT id, service_id, is_active, name FROM compat_set WHERE id = ANY($1::bigint[])', [번호들('compatSetId')]),
    pool.query<{ tc_id: string }>('SELECT tc_id FROM test_case WHERE tc_id = ANY($1::text[]) AND is_active', [줄들.flatMap((x) => x.tcIds ?? [])]),
  ]);
  const 앱번호 = [...줄들.map((x) => x.serviceId), ...시.rows.map((x) => Number(x.service_id)), ...호.rows.map((x) => Number(x.service_id))];
  const 앱들 = await 앱들읽기(projectId, 앱번호, 시.rows.flatMap((x) => 쓰는접두사(x.parts, '')));
  const 서버들 = await 서버들읽기([...앱들.keys()]);
  const 시나리오 = await 실행가능붙이기(projectId, 앱들, 시.rows.map((x) => ({ id: Number(x.id), serviceId: Number(x.service_id), isActive: x.is_active, name: x.name, parts: x.parts })));
  return {
    projectId,
    앱들,
    서버들,
    시나리오,
    호환성: new Map(호.rows.map((x) => [Number(x.id), { serviceId: Number(x.service_id), isActive: x.is_active, name: x.name }])),
    살아있는케이스: new Set(케.rows.map((x) => x.tc_id)),
  };
}

/** 섞인 E2E 의 케이스 단계는 접두사가 곧 애플리케이션이다 — 다른 프로젝트로 옮겨 간 것도 읽어야 「옮겨 감」으로 판정한다 */
async function 앱들읽기(projectId: number, 번호들: readonly number[], 접두사들: readonly string[]): Promise<Map<number, 앱>> {
  const r = await pool.query<{ id: string; prefix: string; name: string; kind: 앱['kind']; is_active: boolean; project_id: string }>(
    'SELECT id, prefix, name, kind, is_active, project_id FROM service WHERE project_id = $1 OR id = ANY($2::bigint[]) OR prefix = ANY($3::text[])',
    [projectId, 번호들, 접두사들],
  );
  return new Map(r.rows.map((x) => [Number(x.id), { id: Number(x.id), prefix: x.prefix, name: x.name, kind: x.kind, isActive: x.is_active, projectId: Number(x.project_id) }]));
}

async function 서버들읽기(앱번호: readonly number[]): Promise<Map<number, Map<string, boolean>>> {
  const r = await pool.query<{ service_id: string; env: string; is_prod: boolean }>('SELECT service_id, env, is_prod FROM service_env WHERE service_id = ANY($1::bigint[])', [앱번호]);
  const 표 = new Map<number, Map<string, boolean>>();
  for (const x of r.rows) {
    const 줄 = 표.get(Number(x.service_id)) ?? new Map<string, boolean>();
    줄.set(x.env, x.is_prod);
    표.set(Number(x.service_id), 줄);
  }
  return 표;
}

type 시나리오줄 = { id: number; serviceId: number; isActive: boolean; name: string; parts: ScenarioPart[] };

/** 케이스 단계를 프로젝트 애플리케이션 안에서 읽어 점검한다 — 시나리오 실행의 「같은 프로젝트 케이스까지」와 같다 (시나리오 §3.7 결정 13) */
export async function 실행가능붙이기(projectId: number, 앱들: Map<number, 앱>, 줄들: readonly 시나리오줄[]): Promise<재료['시나리오']> {
  const 허용 = [...앱들.values()].filter((a) => a.projectId === projectId && a.isActive).map((a) => a.prefix);
  const { 카탈로그 } = 줄들.length === 0 ? { 카탈로그: new Map() } : await 케이스재료(줄들.flatMap((s) => s.parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []))), 허용);
  return new Map(줄들.map((s) => [s.id, { ...s, runnable: 점검(s.parts, 카탈로그).runnable }]));
}

/** 저장 — 담은 줄 · 대상 서버는 지우고 다시 넣는다. 이름이 겹치면 'NAME_TAKEN' */
export async function 세트쓰기(대상: { projectId: number; tz: string } | { id: number }, 몸: 세트몸, 사람: string): Promise<number | 'NAME_TAKEN'> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r =
      'id' in 대상
        ? await c.query<{ id: string }>(
            'UPDATE sched_set SET name = $2, at = $3, days = $4, once_on = $5, updated_by = $6, updated_at = now() WHERE id = $1 RETURNING id',
            [대상.id, 몸.name, 몸.at, 몸.days, 몸.onceOn, 사람],
          )
        : await c.query<{ id: string }>(
            'INSERT INTO sched_set (project_id, name, at, tz, days, once_on, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [대상.projectId, 몸.name, 몸.at, 대상.tz, 몸.days, 몸.onceOn, 사람],
          );
    const id = Number(r.rows[0]!.id);
    await c.query('DELETE FROM sched_set_item WHERE set_id = $1', [id]);
    await c.query('DELETE FROM sched_set_env WHERE set_id = $1', [id]);
    for (const [i, x] of 몸.줄들.entries()) {
      await c.query('INSERT INTO sched_set_item (set_id, seq, kind, service_id, tc_ids, scenario_id, compat_set_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
        id, i + 1, x.kind, x.serviceId, x.tcIds, x.scenarioId, x.compatSetId,
      ]);
    }
    for (const [serviceId, env] of 몸.고름) await c.query('INSERT INTO sched_set_env (set_id, service_id, env) VALUES ($1, $2, $3)', [id, serviceId, env]);
    await c.query('COMMIT');
    return id;
  } catch (err) {
    await c.query('ROLLBACK');
    if ((err as { code?: string }).code === '23505' && (err as { constraint?: string }).constraint === 'sched_set_project_id_name_key') return 'NAME_TAKEN';
    throw err;
  } finally {
    c.release();
  }
}

/**
 * 켜고 끄기 · 기준 정하기. 저장한 때도 새로 찍는다 — 켠 그날 이미 지난 시각에 돌지 않게 한다(§3.16 「저장한 그날」).
 * 끄면 줄에 서서 기다리던 회차도 빠진다(§3.16 「켜고 끈다」)
 */
export async function 세트바꾸기(id: number, projectId: number, 바꿀: { isOn?: boolean; isBase?: boolean }, 사람: string, 기준검사?: () => Promise<boolean>): Promise<boolean> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    // 기준 정하기는 프로젝트마다 한 줄로 세운다 — 앞 사람이 넣고 끝낸 뒤에 검사해야 같은 애플리케이션의 기준이 둘이 안 된다
    if (기준검사 !== undefined) {
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`sched_base:${projectId}`]);
      if (!(await 기준검사())) {
        await c.query('ROLLBACK');
        return false;
      }
    }
    await c.query('UPDATE sched_set SET is_on = COALESCE($2, is_on), is_base = COALESCE($3, is_base), updated_by = $4, updated_at = now() WHERE id = $1', [
      id, 바꿀.isOn ?? null, 바꿀.isBase ?? null, 사람,
    ]);
    if (바꿀.isOn === false) await c.query("UPDATE sched_occurrence SET state = 'SKIPPED', finished_at = now() WHERE set_id = $1 AND state = 'QUEUED'", [id]);
    await c.query('COMMIT');
    return true;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

/** 「한 번만」의 날짜 · 시각이 그 시간대에서 이미 지났나 (§3.16 「저장한 그날」) */
export async function 지났나(onceOn: string, at: string, tz: string): Promise<boolean> {
  const r = await pool.query<{ past: boolean }>('SELECT (($1::date + $2::time) AT TIME ZONE $3) <= now() AS past', [onceOn, at, tz]);
  return r.rows[0]!.past;
}
