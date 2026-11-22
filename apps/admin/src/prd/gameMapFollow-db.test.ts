// 기획서 새 판이 게임 지도를 끌고 가는지 — 지운 요구 요소 · 상태 설정 행 빼기, 바뀐 요구 표시, 다시 올리면 표시 지움 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 채우는 때)

import type { PrdItem } from '@platform/kit';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 요소넣기, 지도글 } from './gameMap.js';
import { 결정판넣기, 잠그고 } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGV';
const 사람 = { username: 'xgv-person', displayName: '검사' };

const 항목 = (번호: string, text: string): PrdItem => ({
  reqId: `XGV-REQ-${번호}`,
  feature: '상점',
  text,
  basis: [{ from: '기획서', quote: text }],
  status: 'CONFIRMED',
});
const 판1 = [항목('001', '상점은 8종을 판다'), 항목('002', '채팅이 없으면 안내가 보인다'), 항목('003', '쓰러지면 결과 창이 뜬다'), 항목('004', '레벨은 30까지다')];

describe.skipIf(연결 === undefined)('기획서 새 판이 게임 지도를 끌고 간다', () => {
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 판저장 = (items: PrdItem[]) => 잠그고(서비스, (손) => 결정판넣기(손, 서비스, items, 사람, []));
  const 요소들 = async () =>
    (await q<{ key: string; req_ids: string[]; prd_changed: string[] }>('SELECT key, req_ids, prd_changed FROM game_element WHERE service_id = $1 ORDER BY key', [서비스])).rows;
  const 행들 = async () => (await q<{ from_key: string; to_key: string | null }>('SELECT from_key, to_key FROM game_route WHERE service_id = $1 ORDER BY id', [서비스])).rows;
  const 치우기 = async () => {
    await q('DELETE FROM game_route WHERE service_id = $1', [서비스]);
    await q('DELETE FROM game_element WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform) VALUES ($1, 'XGV 지도 따라가기 검사용', '#3A5FCD', '', 'xgv', 'GAME', 'android') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
  });

  beforeEach(async () => {
    await 치우기();
    await 판저장(판1);
    await 요소넣기(
      서비스,
      [
        { kind: 'DATA', key: 'shop:단검', name: '단검', value: { 가격: 80 }, reqIds: ['XGV-REQ-001'] },
        { kind: 'STATE', key: 'state:채팅=없음', name: '채팅 없음', value: null, reqIds: ['XGV-REQ-002'] },
        { kind: 'STATE', key: 'state:생존=쓰러짐', name: '쓰러짐', value: null, reqIds: ['XGV-REQ-002', 'XGV-REQ-003'] },
        { kind: 'DATA', key: 'level:30', name: '레벨 30', value: null, reqIds: ['XGV-REQ-004'] },
      ],
      [],
    );
    await q(
      `INSERT INTO game_route (service_id, kind, from_key, action, to_key, status, reason) VALUES
         ($1, 'SETUP', 'state:채팅=없음', '채팅 비우기', NULL, 'BLOCKED', '채팅을 비우는 길이 없다'),
         ($1, 'SETUP', 'game:Lobby', 'GM 채팅 끄기', 'state:채팅=없음', 'OK', NULL),
         ($1, 'SETUP', 'game:Lobby', 'GM 채팅 끄고 쓰러뜨리기', 'state:채팅=없음,생존=쓰러짐', 'OK', NULL),
         ($1, 'MOVE', 'game:Lobby', '상점 열기', 'game:Shop', 'OK', NULL)`,
      [서비스],
    );
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('지운 요구에만 붙은 요소와 그 상태를 목표로 하는 행을 빼고, 다른 요구에도 붙은 요소는 번호만 뗀다', async () => {
    await 판저장(판1.filter((x) => x.reqId !== 'XGV-REQ-002'));

    expect(await 요소들()).toEqual([
      { key: 'level:30', req_ids: ['XGV-REQ-004'], prd_changed: [] },
      { key: 'shop:단검', req_ids: ['XGV-REQ-001'], prd_changed: [] },
      { key: 'state:생존=쓰러짐', req_ids: ['XGV-REQ-003'], prd_changed: [] },
    ]);
    // 「쓰러짐」은 남은 상태라 두 조각 행은 남는다
    expect(await 행들()).toEqual([
      { from_key: 'game:Lobby', to_key: 'state:채팅=없음,생존=쓰러짐' },
      { from_key: 'game:Lobby', to_key: 'game:Shop' },
    ]);
  });

  it('문장이 바뀐 요구에 붙은 요소는 「기획서가 바뀜」이 붙고, 지금 판으로 다시 올리면 지워진다', async () => {
    await 판저장([항목('001', '상점은 9종을 판다'), ...판1.slice(1)]);

    expect((await 요소들()).find((x) => x.key === 'shop:단검')?.prd_changed).toEqual(['XGV-REQ-001']);
    const 글 = await 지도글(서비스);
    expect(글).toContain('기획서가 바뀐 요소 1개');
    expect(글).toContain('- shop:단검 · 단검 · 기획서 {"가격":80} · 근거 XGV-REQ-001 · 기획서가 바뀜(XGV-REQ-001) — 지금 판으로 다시 올린다');
    expect(글).not.toContain('level:30 · 레벨 30 · 근거 XGV-REQ-004 · 기획서가 바뀜');

    await 요소넣기(서비스, [{ kind: 'DATA', key: 'shop:단검', name: '단검', value: { 가격: 80 }, reqIds: ['XGV-REQ-001'] }], []);
    expect((await 요소들()).find((x) => x.key === 'shop:단검')?.prd_changed).toEqual([]);
    expect(await 지도글(서비스)).not.toContain('기획서가 바뀜');
  });

  it('상태 · 근거만 바뀌고 문장이 같으면 아무것도 건드리지 않는다', async () => {
    await 판저장(판1.map((x) => (x.reqId === 'XGV-REQ-004' ? { ...x, status: 'NEEDS_CHECK' as const, basis: [{ from: '화면', quote: '레벨 30' }] } : x)));

    expect((await 요소들()).every((x) => x.prd_changed.length === 0)).toBe(true);
    expect(await 행들()).toHaveLength(4);
  });
});
