// 시나리오 저장소 — 버전 쌓기 · 동시 고치기 · 되돌리기 · 치우기 (SPEC 도메인/시나리오 §3.7 결정 7)

import type { ScenarioPart } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 고치기, 되돌리기, 만들기, 목록, 상세, 옛버전, 치우기 } from './store.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('시나리오 저장소', () => {
  const 서비스: Record<string, number> = {};
  const 사람 = { username: 'xss', displayName: '검사 사람' };
  const 딴사람 = { username: 'xss-b', displayName: '딴 사람' };
  const 부품: ScenarioPart[] = [{ kind: 'wait', ms: 10 }];
  const 딴부품: ScenarioPart[] = [{ kind: 'wait', ms: 20 }];

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 치우기표 = async (id: number) => {
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [id]);
    await q('DELETE FROM test_run WHERE service_id = $1', [id]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [id]);
    await q('DELETE FROM scenario WHERE service_id = $1', [id]);
  };

  beforeAll(async () => {
    for (const prefix of ['XSS', 'XSS2']) {
      const r = await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $1, '#3A5FCD', '', 'xss')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true
           RETURNING id`,
        [prefix],
      );
      서비스[prefix] = Number((r.rows[0] as { id: string }).id);
      await 치우기표(서비스[prefix]!);
    }
  });

  afterAll(async () => {
    for (const id of Object.values(서비스)) {
      await 치우기표(id);
      await q('DELETE FROM service WHERE id = $1', [id]);
    }
  });

  it('만들면 버전 1 이고 상세에 서비스 접두사와 저장한 사람이 있다', async () => {
    const 새것 = await 만들기(서비스.XSS!, 'XSS 주문 흐름', 'mobile', 부품, 사람);
    expect(새것.version).toBe(1);

    const 본것 = await 상세(새것.id);
    expect(본것).toMatchObject({
      id: 새것.id,
      service: 'XSS',
      name: 'XSS 주문 흐름',
      platform: 'mobile',
      version: 1,
      parts: 부품,
      isActive: true,
      versions: [{ version: 1, savedBy: 'xss', savedByName: '검사 사람' }],
    });
    expect(typeof 본것?.versions[0]?.savedAt).toBe('string');
  });

  it('고치면 버전이 오르고 옛 버전은 그대로다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 고치기', 'desktop', 부품, 사람);
    expect(await 고치기(id, { name: 'XSS 고친 이름', platform: 'mobile', parts: 딴부품, baseVersion: 1 }, 딴사람)).toEqual({
      version: 2,
    });

    expect(await 옛버전(id, 1)).toEqual({ platform: 'desktop', parts: 부품 });
    expect(await 옛버전(id, 2)).toEqual({ platform: 'mobile', parts: 딴부품 });
    expect(await 옛버전(id, 3)).toBeNull();

    const 본것 = await 상세(id);
    expect(본것).toMatchObject({ name: 'XSS 고친 이름', version: 2, platform: 'mobile' });
    expect(본것?.versions.map((v) => [v.version, v.savedBy])).toEqual([
      [2, 'xss-b'],
      [1, 'xss'],
    ]);
  });

  it('옛 버전을 고쳤으면 STALE_VERSION 과 지금 최신을 준다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 늦은 저장', 'desktop', 부품, 사람);
    await 고치기(id, { name: 'a', platform: 'desktop', parts: 부품, baseVersion: 1 }, 사람);
    expect(await 고치기(id, { name: 'b', platform: 'desktop', parts: 부품, baseVersion: 1 }, 사람)).toEqual({
      error: 'STALE_VERSION',
      latest: 2,
    });
  });

  it('둘이 같은 버전을 동시에 고치면 하나만 된다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 동시', 'desktop', 부품, 사람);
    const 결과 = await Promise.all([
      고치기(id, { name: 'a', platform: 'desktop', parts: 부품, baseVersion: 1 }, 사람),
      고치기(id, { name: 'b', platform: 'desktop', parts: 딴부품, baseVersion: 1 }, 딴사람),
    ]);
    expect(결과).toEqual(expect.arrayContaining([{ version: 2 }, { error: 'STALE_VERSION', latest: 2 }]));
    expect((await 상세(id))?.versions).toHaveLength(2);
  });

  it('되돌리기는 옛 버전의 디바이스와 부품을 복사한 새 버전이다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 되돌리기', 'mobile', 부품, 사람);
    await 고치기(id, { name: 'XSS 되돌리기', platform: 'desktop', parts: 딴부품, baseVersion: 1 }, 사람);
    expect(await 되돌리기(id, 1, 딴사람)).toEqual({ version: 3 });
    expect(await 옛버전(id, 3)).toEqual({ platform: 'mobile', parts: 부품 });
    expect(await 되돌리기(id, 9, 딴사람)).toBeNull();
    expect(await 되돌리기(999999999, 1, 딴사람)).toBeNull();
  });

  it('치우면 목록에서 빠지고 상세는 된다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 치울 것', 'desktop', 부품, 사람);
    expect(await 치우기(id)).toBe(true);
    expect((await 목록(서비스.XSS!)).map((s) => s.id)).not.toContain(id);
    expect((await 상세(id))?.isActive).toBe(false);
    expect(await 치우기(999999999)).toBe(false);
  });

  it('목록은 그 서비스 것만 최신 버전으로 준다', async () => {
    const 내것 = await 만들기(서비스.XSS!, 'XSS 목록', 'desktop', 부품, 사람);
    await 고치기(내것.id, { name: 'XSS 목록', platform: 'mobile', parts: [...부품, ...딴부품], baseVersion: 1 }, 사람);
    const 남의것 = await 만들기(서비스.XSS2!, 'XSS2 목록', 'desktop', 부품, 사람);

    const 줄들 = await 목록(서비스.XSS!);
    expect(줄들.map((s) => s.id)).not.toContain(남의것.id);
    expect(줄들.find((s) => s.id === 내것.id)).toEqual({
      id: 내것.id,
      name: 'XSS 목록',
      platform: 'mobile',
      version: 2,
      partCount: 2,
      isActive: true,
      lastRun: null,
      parts: [...부품, ...딴부품],
    });
  });

  const 실행넣기 = async (scenarioId: number | null, status: string, 부품판정: string[], kind = 'SCENARIO') => {
    const r = await q(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, finished_at)
       VALUES ('XSS 실행', 'xss', 'qa', $1, $2, 'XSS', '', '', $3, $4, $5,
               CASE WHEN $1 = 'RUNNING' THEN NULL ELSE now() END)
       RETURNING run_id`,
      [status, 서비스.XSS!, kind, scenarioId, scenarioId === null ? null : 1],
    );
    const runId = Number((r.rows[0] as { run_id: string }).run_id);
    for (const [i, 판정] of 부품판정.entries()) {
      await q(`INSERT INTO scenario_run_part (run_id, seq, kind, part, status) VALUES ($1, $2, 'wait', '{}', $3)`, [
        runId,
        i + 1,
        판정,
      ]);
    }
    return runId;
  };
  const 마지막실행 = async (id: number) => (await 목록(서비스.XSS!)).find((s) => s.id === id)?.lastRun;

  it('실행이 없으면 lastRun 은 null 이다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 실행 없음', 'desktop', 부품, 사람);
    expect(await 마지막실행(id)).toBeNull();
  });

  it('lastRun 은 가장 최근 실행 하나이고 다른 시나리오 실행과 케이스 실행은 안 본다', async () => {
    const { id } = await 만들기(서비스.XSS!, 'XSS 최신', 'desktop', 부품, 사람);
    const 딴것 = await 만들기(서비스.XSS!, 'XSS 딴 시나리오', 'desktop', 부품, 사람);
    await 실행넣기(id, 'FINISHED', ['FAIL']);
    const 최신 = await 실행넣기(id, 'FINISHED', ['PASS', 'PASS']);
    await 실행넣기(딴것.id, 'FINISHED', ['FAIL']);
    await 실행넣기(null, 'FINISHED', [], 'CASE');

    const 본것 = await 마지막실행(id);
    expect(본것).toMatchObject({ runId: 최신, status: 'FINISHED', verdict: 'PASS' });
    expect(typeof 본것?.finishedAt).toBe('string');
    expect((await 마지막실행(딴것.id))?.verdict).toBe('FAIL');
  });

  it.each([
    ['FINISHED', ['PASS', 'PASS'], 'PASS'],
    ['FINISHED', ['PASS', 'FAIL', 'NA'], 'FAIL'],
    ['ABORTED', ['PASS', 'NA'], 'NA'],
    ['RUNNING', ['PASS', 'NA'], null],
  ])('실행 %s · 부품 %j 이면 verdict 는 %s 다', async (status, 판정, 기대) => {
    const { id } = await 만들기(서비스.XSS!, `XSS 접기 ${status}`, 'desktop', 부품, 사람);
    await 실행넣기(id, status, 판정);
    const 본것 = await 마지막실행(id);
    expect(본것?.verdict).toBe(기대);
    expect(본것?.finishedAt === null).toBe(status === 'RUNNING');
  });

  it('없는 번호는 null 이다', async () => {
    expect(await 상세(999999999)).toBeNull();
    expect(await 옛버전(999999999, 1)).toBeNull();
    expect(await 고치기(999999999, { name: 'a', platform: 'desktop', parts: 부품, baseVersion: 1 }, 사람)).toBeNull();
  });
});
