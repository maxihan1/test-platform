// 케이스 선언의 게임 요소 열쇠(`elements`)로 게임 지도의 요소를 거친 케이스(game_element_case)를 다시 채운다 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 · 공통/4 game_element_case)

import type { CaseSpec } from '@platform/kit';
import type { Pool } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 게임이 아닌 애플리케이션 케이스가 적은 요소 — 지도에 넣지 않고 스캔 문제로 알린다(kit 은 종류를 몰라 막지 못한다) */
export function 게임밖요소(specs: readonly CaseSpec[]): string[] {
  return specs.filter((s) => (s.elements ?? []).length > 0).map((s) => `${s.filePath}의 ${s.tcId}은 게임 애플리케이션 케이스가 아닌데 elements 를 적어 게임 지도에 넣지 않았다`);
}

/**
 * 그 애플리케이션 몫을 지우고 다시 채운다(사본이라 손으로 안 고친다). 열쇠가 지도에 있는지는 안 본다 — 외래 키를 안 거는 까닭과 같다(공통/4).
 * 케이스 파일을 다 읽지 못했으면 읽은 케이스 몫만 바꾼다 — 지도 ② 와 같은 까닭이다(무엇이 정말 사라졌는지 모른다)
 */
export async function 요소지도채우기(serviceId: number, specs: readonly CaseSpec[], 전부읽음: boolean): Promise<number> {
  const 줄들 = specs.flatMap((s) => (s.elements ?? []).map((key) => ({ key, tcId: s.tcId })));
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 기동 스캔과 「다시 스캔」이 겹치면 뒤엣것의 넣기가 앞엣것이 넣은 줄과 부딪힌다. 애플리케이션마다 차례로 세운다 (지도 ① · ② 와 같다)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('game_element_case'), $1::int)", [serviceId]);
    await client.query('DELETE FROM game_element_case WHERE service_id = $1 AND ($2::boolean OR tc_id = ANY($3::text[]))', [
      serviceId,
      전부읽음,
      specs.map((s) => s.tcId),
    ]);
    await client.query(
      `INSERT INTO game_element_case (service_id, key, tc_id)
       SELECT $1, * FROM unnest($2::text[], $3::text[])`,
      [serviceId, 줄들.map((x) => x.key), 줄들.map((x) => x.tcId)],
    );
    await client.query('COMMIT');
    return 줄들.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
