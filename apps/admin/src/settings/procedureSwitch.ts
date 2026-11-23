// 「프로시저 작성」 스위치 저장 검사 — 켤 수 없는 종류 · 끌 수 없는 사용 중 (도메인/실행 「프로시저 작성 스위치」)
// store.ts 가 300줄을 넘어 따로 둔다. 서비스 저장과 같은 묶음 안에서 불러, 검사와 저장 사이에 케이스가 끼어들지 않게 한다

import type { PoolClient } from 'pg';

import { 설정오류 } from './errors.js';

/**
 * 스위치를 바꿔도 되는지 보고, 꺼짐에서 켜짐으로 바뀌면 true 를 돌려준다.
 * 서비스 줄을 잠가 읽는다 — 같은 때에 끄는 저장과 케이스를 올리는 스캔이 엇갈리지 않게.
 * 없는 서비스는 여기서 던지지 않는다. 뒤따르는 UPDATE 가 NOT_FOUND 로 던진다
 */
export async function 프로시저스위치(client: PoolClient, id: number, 켜기: boolean): Promise<boolean> {
  const 줄 = await client.query<{ kind: string; prefix: string; procedure_mode: boolean }>(
    'SELECT kind, prefix, procedure_mode FROM service WHERE id = $1 FOR UPDATE',
    [id],
  );
  const 지금 = 줄.rows[0];
  if (지금 === undefined) return false;
  // DB CHECK 에 걸려 500 이 나기 전에 먼저 거른다
  if (켜기 && 지금.kind !== 'APP' && 지금.kind !== 'GAME') throw new 설정오류('NOT_PROCEDURE_SERVICE');
  if (!켜기 && 지금.procedure_mode) {
    const 쓰는중 = await client.query(
      `SELECT 1 FROM test_case WHERE tc_id LIKE $1 || '-%' AND is_active AND proc_id IS NOT NULL LIMIT 1`,
      [지금.prefix],
    );
    if (쓰는중.rowCount !== 0) throw new 설정오류('PROCEDURE_IN_USE');
  }
  return 켜기 && !지금.procedure_mode;
}
