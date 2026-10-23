// 스캔 결과를 test_case 에 저장하고 사라진 케이스를 비활성으로 내린다 (SPEC §3.1)

import type { Pool } from 'pg';

import type { CaseSpec } from '@platform/kit';

export interface SaveResult {
  added: number;
  updated: number;
  deactivated: number;
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. check:tests와 CI는 DB 없이 돌아야 하므로
// 풀은 실제로 쓸 때 가져온다 (smoke.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const UPSERT = `
  INSERT INTO test_case
    (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, scanned_at,
     techniques, api_doc, elements, smoke)
  VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), $8::text[], $9, $10::text[], $11)
  ON CONFLICT (tc_id) DO UPDATE SET
    name            = EXCLUDED.name,
    platforms       = EXCLUDED.platforms,
    precondition    = EXCLUDED.precondition,
    file_path       = EXCLUDED.file_path,
    param_schema    = EXCLUDED.param_schema,
    expected_schema = EXCLUDED.expected_schema,
    techniques      = EXCLUDED.techniques,
    api_doc         = EXCLUDED.api_doc,
    elements        = EXCLUDED.elements,
    smoke           = EXCLUDED.smoke,
    is_active       = true,
    scanned_at      = now()
  RETURNING (xmax = 0) AS inserted`;

export async function save(specs: CaseSpec[], deactivateMissing: boolean, prefix: string): Promise<SaveResult> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    let added = 0;
    for (const spec of specs) {
      // xmax가 0이면 새로 넣은 행이다. 갱신된 행은 0이 아니다 — 추가와 갱신을 한 번의 질의로 가른다
      const upserted = await client.query<{ inserted: boolean }>(UPSERT, [
        spec.tcId,
        spec.name,
        JSON.stringify(spec.platforms),
        JSON.stringify(spec.precondition),
        spec.filePath,
        JSON.stringify(spec.paramSchema),
        JSON.stringify(spec.expectedSchema),
        // 지우면 '{}' 로 덮어야 다시 스캔한 결과가 코드와 같다 — 비워 두면 옛 기법이 남는다
        spec.techniques ?? [],
        // 케이스가 만들어진 API 문서 판. 실행이 이 판 원문을 러너에 싣는다 (도메인/API §3.8 「응답 모양 확인」)
        spec.apiDoc ?? null,
        // 게임 요소 열쇠도 기법처럼 지우면 '{}' 로 덮는다 — game_element_case 는 스캔이 이 값에서 다시 채운다 (도메인/게임 §3.10)
        spec.elements ?? [],
        // 코드 값만 덮는다. 사람이 목록에서 고친 smoke_set 은 스캔이 건드리지 않는다 (도메인/게임 §3.10 「빌드마다 돌리기」)
        spec.smoke === true,
      ]);
      if (upserted.rows[0]?.inserted === true) added += 1;
    }

    // 코드에서 사라진 케이스는 지우지 않는다. 과거 실행 이력이 참조하므로 비활성으로만 둔다 (SPEC §3.1).
    // 0건이어도 내린다 — 폴더를 비운 서비스의 케이스가 남으면 실행이 CASE_NOT_FOUND 로 빈 절차를 쌓는다.
    // 마운트가 빠진 경우는 부르는 쪽(scanRun.ts)이 뿌리 폴더를 보고 거른다.
    // 범위는 이 서비스의 접두사 안이다 — 서비스마다 자기 폴더만 훑으므로(§9.2) 전체를 범위로 잡으면
    // 한 서비스를 스캔할 때 다른 서비스의 케이스가 통째로 내려간다
    let deactivated = 0;
    if (deactivateMissing) {
      const dropped = await client.query(
        `UPDATE test_case SET is_active = false
          WHERE is_active = true AND tc_id LIKE $2 AND tc_id <> ALL($1::text[])`,
        [specs.map((s) => s.tcId), `${prefix}-%`],
      );
      deactivated = dropped.rowCount ?? 0;
    }

    await client.query('COMMIT');
    return { added, updated: specs.length - added, deactivated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
