// 성능 시나리오 정기 실행을 실제 DB 로 본다 — 켜기 검사(admin 만 · 시간대 · 대상 서버 · 저장된 부하 설정) · 1분 점검이 만든 실행 · 만들지 못할 때 끄기와 알림 (PERF-F1-06)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 차리기, type 차림 } from './dbFixture.js';
import { 정기성능점검 } from './schedule.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트이름 = 'xpks-load';

describe.skipIf(연결 === undefined)('성능 정기 실행', { timeout: 60_000 }, () => {
  let f: 차림;
  let 시나리오 = 0;
  let 빈시나리오 = 0;
  let 에이전트번호 = 0;
  const 보낸것: string[] = [];
  const 보내기 = async (_웹훅: string, 글: string) => {
    보낸것.push(글);
    return true;
  };

  const 범위 = () => [f.서비스];
  const 켜기 = (id: number, env = 'qa', at = '03:17', tz = 'UTC') => f.사람(f.관리자, 'PUT', `/api/perf/scenarios/${id}/schedule`, { at, tz, env });
  const 스케줄 = async (id: number) => (await f.사람(f.읽기만, 'GET', `/api/perf/scenarios/${id}`)).json<{ schedule: unknown }>().schedule;
  const 실행들 = async () =>
    (await f.pool.query<{ id: string; origin: string; triggered_by: string; status: string; scenario_version: number; env: string }>(
      'SELECT id, origin, triggered_by, status, scenario_version, env FROM perf_run WHERE service_id = $1 ORDER BY id', [f.서비스],
    )).rows;

  beforeAll(async () => {
    f = await 차리기('XPKS');
    const 에이전트 = await f.pool.query<{ id: string }>(
      `INSERT INTO perf_agent (name, mode, token_hash, max_vus, last_seen_at, created_by) VALUES ($1, 'LOAD', 'xpks-hash', 500, now(), 'xpks') RETURNING id`,
      [에이전트이름],
    );
    에이전트번호 = Number(에이전트.rows[0]?.id);
    시나리오 = await f.시나리오만들기('정기 대상', {
      transactions: [{ name: '목록', method: 'GET', url: '/api/items' }],
      load: { basis: 'VUS', stages: [{ durationSec: 30, target: 10 }], testType: 'STRESS' },
      targets: [{ metric: 'P95', op: '<=', value: 500, source: 'AI' }],
      run: { agentIds: [에이전트번호] },
    });
    빈시나리오 = await f.시나리오만들기('부하 설정 없음');
    await f.pool.query(`UPDATE service SET slack_webhook = 'https://hooks.example.test/xpks' WHERE id = $1`, [f.서비스]);
  });
  afterAll(async () => {
    await f?.정리();
    await f.pool.query('DELETE FROM perf_agent WHERE name = $1', [에이전트이름]);
  });

  it('켜기는 admin 만 하고 시간 모양 · 시간대 · 대상 서버 · 저장된 부하 설정이 맞아야 한다', async () => {
    expect((await f.사람(f.쓰기, 'PUT', `/api/perf/scenarios/${시나리오}/schedule`, { at: '03:17', tz: 'UTC', env: 'qa' })).statusCode).toBe(403);
    expect((await 켜기(시나리오, 'qa', '3:17')).statusCode).toBe(400);
    expect((await 켜기(시나리오, 'qa', '03:17', 'Mars/Base')).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: 'tz: Mars/Base' });
    expect((await 켜기(시나리오, '없는서버')).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: 'env: 없는서버' });
    expect((await 켜기(시나리오, 'live')).json()).toEqual({ error: 'PROD_ENV_BLOCKED' });
    expect((await 켜기(빈시나리오)).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '마법사 4단계를 저장한 뒤 켭니다' });
    expect((await 켜기(999_999_999)).statusCode).toBe(404);
    expect(await 스케줄(시나리오)).toBeNull();

    const 켠 = await 켜기(시나리오);
    expect(켠.json()).toEqual({ schedule: { at: '03:17', tz: 'UTC', env: 'qa' } });
    expect(await 스케줄(시나리오)).toEqual({ at: '03:17', tz: 'UTC', env: 'qa' });
    const 끔 = await f.app.inject({ method: 'PUT', url: `/api/perf/scenarios/${시나리오}/schedule`, headers: { cookie: f.관리자, 'content-type': 'application/json' }, payload: 'null' });
    expect(끔.json()).toEqual({ schedule: null });
    expect(await 스케줄(시나리오)).toBeNull();
  });

  it('정한 시각부터 1시간 안에 하루 한 번 SCHEDULED 실행을 만들고 저장된 부하 설정을 쓴다', async () => {
    await 켜기(시나리오);
    expect(await 정기성능점검(new Date('2001-01-01T02:59:00Z'), 보내기, 범위())).toEqual([]);
    const 첫 = await 정기성능점검(new Date('2001-01-01T03:30:00Z'), 보내기, 범위());
    expect(첫).toEqual([{ scenarioId: 시나리오, runId: expect.any(Number) }]);
    expect(await 정기성능점검(new Date('2001-01-01T03:40:00Z'), 보내기, 범위())).toEqual([]);
    expect(await 정기성능점검(new Date('2001-01-02T04:30:00Z'), 보내기, 범위())).toEqual([]);
    expect(await 정기성능점검(new Date('2001-01-02T03:20:00Z'), 보내기, 범위())).toHaveLength(1);

    const 만든 = await 실행들();
    expect(만든).toHaveLength(2);
    expect(만든[0]).toMatchObject({ origin: 'SCHEDULED', triggered_by: 'schedule', status: 'QUEUED', scenario_version: 1, env: 'qa' });
    const 설정 = (await f.pool.query<{ test_type: string; config: { load: { stages: unknown[] }; targets: unknown[]; agentIds: number[] } }>('SELECT test_type, config FROM perf_run WHERE id = $1', [만든[0]?.id])).rows[0];
    expect(설정).toMatchObject({ test_type: 'STRESS', config: { agentIds: [에이전트번호], load: { stages: [{ durationSec: 30, target: 10 }] } } });
    expect(설정?.config.targets).toHaveLength(1);
    expect(보낸것).toEqual([]);
  });

  it('대상 서버가 실서비스 서버가 됐거나 지워졌으면 실행 없이 정기 실행을 끄고 알림을 보낸다', async () => {
    await f.pool.query('DELETE FROM perf_run WHERE service_id = $1', [f.서비스]);
    await f.pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'tmp', 'http://tmp.xpks.test')`, [f.서비스]);
    await f.pool.query(`UPDATE perf_scenario SET schedule_last = NULL WHERE id = $1`, [시나리오]);
    await 켜기(시나리오, 'tmp');
    await f.pool.query(`UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'tmp'`, [f.서비스]);
    const 운영 = await 정기성능점검(new Date('2001-02-01T03:30:00Z'), 보내기, 범위());
    expect(운영).toEqual([{ scenarioId: 시나리오, 거절: '대상 서버 tmp 가 실서비스 서버가 되었습니다', 껐다: true }]);
    expect(await 실행들()).toEqual([]);
    expect(await 스케줄(시나리오)).toBeNull();
    expect(보낸것).toEqual(['[오류] 정기 대상 성능 테스트 정기 실행을 만들지 못했습니다 — 대상 서버 tmp 가 실서비스 서버가 되었습니다. 정기 실행을 껐습니다']);

    보낸것.length = 0;
    await f.pool.query(`UPDATE service_env SET is_prod = false WHERE service_id = $1 AND env = 'tmp'`, [f.서비스]);
    await 켜기(시나리오, 'tmp');
    await f.pool.query(`DELETE FROM service_env WHERE service_id = $1 AND env = 'tmp'`, [f.서비스]);
    const 지움 = await 정기성능점검(new Date('2001-02-02T03:30:00Z'), 보내기, 범위());
    expect(지움[0]).toMatchObject({ 거절: '대상 서버 tmp 가 지워졌습니다', 껐다: true });
    expect(보낸것[0]).toContain('정기 실행을 껐습니다');
  });

  it('시각 · 대상 서버 · 시간대를 바꾸면 돈 기록을 비워 늦춘 시각에 같은 날 다시 돈다. 같은 값을 다시 저장하면 그대로 둔다', async () => {
    await f.pool.query(`UPDATE perf_agent SET last_seen_at = now() WHERE id = $1`, [에이전트번호]);
    await f.pool.query(`UPDATE perf_scenario SET schedule_last = NULL WHERE id = $1`, [시나리오]);
    const 돈때 = async () => (await f.pool.query<{ schedule_last: Date | null }>('SELECT schedule_last FROM perf_scenario WHERE id = $1', [시나리오])).rows[0]?.schedule_last;
    await 켜기(시나리오, 'qa', '03:17');
    expect(await 정기성능점검(new Date('2001-04-01T03:30:00Z'), 보내기, 범위())).toHaveLength(1);
    expect(await 돈때()).not.toBeNull();

    await 켜기(시나리오, 'qa', '03:17');
    expect(await 돈때()).not.toBeNull();

    await 켜기(시나리오, 'qa', '05:00');
    expect(await 돈때()).toBeNull();
    expect(await 정기성능점검(new Date('2001-04-01T05:10:00Z'), 보내기, 범위())).toHaveLength(1);
  });

  it('연결된 에이전트가 없는 거절은 실행을 안 만들고 알림만 보내며 정기 실행은 그대로 둔다', async () => {
    보낸것.length = 0;
    await f.pool.query('DELETE FROM perf_run WHERE service_id = $1', [f.서비스]);
    await f.pool.query(`UPDATE perf_scenario SET schedule_last = NULL WHERE id = $1`, [시나리오]);
    await 켜기(시나리오);
    await f.pool.query(`UPDATE perf_agent SET last_seen_at = now() - interval '5 minutes' WHERE id = $1`, [에이전트번호]);
    const 결과 = await 정기성능점검(new Date('2001-03-01T03:30:00Z'), 보내기, 범위());
    expect(결과).toEqual([{ scenarioId: 시나리오, 거절: '연결된 부하 발생 에이전트가 없습니다' }]);
    expect(await 실행들()).toEqual([]);
    expect(await 스케줄(시나리오)).toEqual({ at: '03:17', tz: 'UTC', env: 'qa' });
    expect(보낸것).toEqual(['[오류] 정기 대상 성능 테스트 정기 실행을 만들지 못했습니다 — 연결된 부하 발생 에이전트가 없습니다']);
  });
});
