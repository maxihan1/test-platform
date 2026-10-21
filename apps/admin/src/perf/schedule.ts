// 성능 시나리오 정기 실행 — 켤 때 쓰는 재료 검사 · 1분마다 돌 때가 된 시나리오를 집어 실행을 만든다 (도메인/성능 §7 「정기 실행」 · 공통/6-인프라 §9.2)

import type { PoolClient } from 'pg';

import { 슬랙으로 } from '../execution/notify.js';
import { 실행세우기, 실행만들기본문, type 실행입력, type 만들기결과 } from './runCreate.js';
import * as 표 from './store.js';
import type { ScenarioBody } from './types.js';

export const 저장먼저 = '마법사 4단계를 저장한 뒤 켭니다';

/**
 * 시나리오 본문에 저장된 부하 설정 · 유형 · 에이전트로 실행 만들기 입력을 짠다.
 * 정기 실행은 사람이 마법사를 거치지 않으므로 이 셋이 저장돼 있어야 한다
 */
export function 정기실행재료(scenarioId: number, env: string, body: ScenarioBody): { input: 실행입력 } | { error: string } {
  const run = (body.run ?? {}) as { agentIds?: unknown; monitorIds?: unknown; pageCheck?: unknown };
  if (body.load?.stages === undefined || body.load.testType === undefined || !Array.isArray(run.agentIds) || run.agentIds.length === 0) return { error: 저장먼저 };
  const p = 실행만들기본문.safeParse({
    scenarioId, env, testType: body.load.testType, basis: body.load.basis, stages: body.load.stages, targets: body.targets ?? [],
    agentIds: run.agentIds, monitorIds: run.monitorIds ?? [], pageCheck: run.pageCheck === true,
  });
  return p.success ? { input: p.data } : { error: `${저장먼저} — ${p.error.message.slice(0, 200)}` };
}

export interface 돌때된줄 {
  id: number;
  serviceId: number;
  name: string;
  env: string;
}

/**
 * 지금 돌 시나리오를 집는다 — 고르는 것과 「마지막으로 돈 때」를 적는 것이 한 문장이라 둘이 같은 시나리오를 집지 않는다.
 * 조건은 execution/scheduled.ts 의 돌때가된서비스와 같다(켜짐 · 그 시간대의 지금이 정한 시각부터 1시간 안 · 오늘 아직 안 돌았다).
 * 지운 시나리오와 쓰지 않는 애플리케이션은 건너뛴다. 검사는 지금과 자기 애플리케이션 번호를 넘겨 개발 DB 의 남의 시나리오를 건드리지 않게 한다
 */
export async function 돌때가된시나리오(지금: Date | null = null, db?: Pick<PoolClient, 'query'>, 범위: number[] | null = null): Promise<돌때된줄[]> {
  const 손 = db ?? (await 표.풀());
  const r = await 손.query<{ id: string; service_id: string; name: string; env: string }>(
    `WITH 기준 AS (SELECT COALESCE($1::timestamptz, now()) AS t)
     UPDATE perf_scenario p
        SET schedule_last = 기준.t
       FROM 기준
      WHERE p.deleted_at IS NULL
        AND p.schedule_at IS NOT NULL
        AND ($2::bigint[] IS NULL OR p.service_id = ANY($2))
        AND EXISTS (SELECT 1 FROM service s WHERE s.id = p.service_id AND s.is_active)
        AND (기준.t AT TIME ZONE p.schedule_tz)::time - p.schedule_at >= interval '0'
        AND (기준.t AT TIME ZONE p.schedule_tz)::time - p.schedule_at <  interval '1 hour'
        AND (p.schedule_last IS NULL
             OR (p.schedule_last AT TIME ZONE p.schedule_tz)::date < (기준.t AT TIME ZONE p.schedule_tz)::date)
      RETURNING p.id, p.service_id, p.name, p.schedule_env AS env`,
    [지금, 범위],
  );
  return r.rows.map((x) => ({ id: Number(x.id), serviceId: Number(x.service_id), name: x.name, env: x.env }));
}

function 까닭글(거절: Extract<만들기결과, { error: string }>, env: string): string {
  if (거절.error === 'PROD_ENV_BLOCKED') return `대상 서버 ${env} 가 실서비스 서버가 되었습니다`;
  if (거절.대상서버문제 === true) return `대상 서버 ${env} 가 지워졌습니다`;
  if (거절.error === 'NO_AGENT') return '연결된 부하 발생 에이전트가 없습니다';
  if (거절.error === 'HOST_NOT_ALLOWED') return `허용하지 않은 호스트를 부릅니다 (${거절.detail ?? ''})`;
  return 거절.detail === undefined ? 거절.error : `${거절.error} — ${거절.detail}`;
}

export interface 점검결과 {
  scenarioId: number;
  runId?: number;
  거절?: string;
  껐다?: boolean;
}

/** 만들지 못한 까닭을 그 애플리케이션의 Slack 에 한 줄로 알린다. 웹훅이 없으면 안 보내고, 보내기 실패는 로그만 남긴다 */
async function 실패알림(serviceId: number, 글: string, 보내기: (웹훅: string, 글: string) => Promise<boolean>): Promise<void> {
  const r = await (await 표.풀()).query<{ slack_webhook: string | null }>('SELECT slack_webhook FROM service WHERE id = $1', [serviceId]);
  const 웹훅 = r.rows[0]?.slack_webhook ?? '';
  if (웹훅 === '') return;
  try {
    if (!(await 보내기(웹훅, 글))) console.error(`성능 정기 실행 알림을 Slack 이 받지 않았습니다: ${글}`);
  } catch (e) {
    console.error(`성능 정기 실행 알림을 보내지 못했습니다: ${글}`, e);
  }
}

/**
 * 1분마다 부른다. 만들지 못해도 그날은 다시 안 돈다 — 1분마다 같은 실패를 되풀이하지 않는다.
 * 대상 서버가 지워졌거나 실서비스 서버가 됐으면 정기 실행을 끄고, 그 밖의 거절은 알림만 보낸다
 */
export async function 정기성능점검(지금: Date | null = null, 보내기: (웹훅: string, 글: string) => Promise<boolean> = 슬랙으로, 범위: number[] | null = null): Promise<점검결과[]> {
  const 결과: 점검결과[] = [];
  for (const 줄 of await 돌때가된시나리오(지금, undefined, 범위)) {
    결과.push(await 한시나리오(줄, 보내기));
  }
  return 결과;
}

async function 한시나리오(줄: 돌때된줄, 보내기: (웹훅: string, 글: string) => Promise<boolean>): Promise<점검결과> {
  const 알림 = (글: string) => 실패알림(줄.serviceId, `[오류] ${줄.name} 성능 테스트 정기 실행을 만들지 못했습니다 — ${글}`, 보내기);
  try {
    const b = await (await 표.풀()).query<{ body: ScenarioBody }>(
      `SELECT v.body FROM perf_scenario s JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version WHERE s.id = $1`,
      [줄.id],
    );
    const 재료 = 정기실행재료(줄.id, 줄.env, b.rows[0]?.body ?? {});
    if ('error' in 재료) {
      await 알림(재료.error);
      return { scenarioId: 줄.id, 거절: 재료.error };
    }
    const r = await 실행세우기(재료.input, { origin: 'SCHEDULED', triggeredBy: 'schedule', triggeredByName: '스케줄러' });
    if ('runId' in r) return { scenarioId: 줄.id, runId: r.runId };
    const 까닭 = 까닭글(r, 줄.env);
    if (r.대상서버문제 === true) {
      await (await 표.풀()).query('UPDATE perf_scenario SET schedule_at = NULL, schedule_tz = NULL, schedule_env = NULL WHERE id = $1', [줄.id]);
      await 알림(`${까닭}. 정기 실행을 껐습니다`);
      return { scenarioId: 줄.id, 거절: 까닭, 껐다: true };
    }
    await 알림(까닭);
    return { scenarioId: 줄.id, 거절: 까닭 };
  } catch (e) {
    console.error(`성능 시나리오 ${줄.id} 의 정기 실행을 만들지 못했습니다`, e);
    return { scenarioId: 줄.id, 거절: e instanceof Error ? e.message : String(e) };
  }
}
