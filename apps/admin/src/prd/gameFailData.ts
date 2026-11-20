// 게임 실패 항목의 자료 — 실패한 절차 · 오류 원문 · game-tree.txt · game-errors.txt 를 가려서 작성 에이전트 통로에 준다 (도메인/게임 §3.10 「실패 자동 수정」 3)

import { GAME_ERRORS_FILE } from '@platform/kit';
import { GAME_TREE_FILE } from '@platform/kit/protocol';

import { 글가린다 } from '../execution/traceIngest.js';
import { 게임실패파일읽기 } from '../execution/farmEvidence.js';
import { findItem } from '../execution/queries.js';
import { 항목비밀 } from '../execution/trial.js';

/** 파일 하나가 자식 자료 폴더에서 차지할 상한 — 가린 뒤에 자른다. 오브젝트 목록이 수백 줄이어도 앞쪽이면 이름이 바뀐 것을 찾는 데 충분하다 */
const 파일상한 = 20_000;

export interface 게임실패 {
  /** 처음 통과하지 못한 절차 제목 */
  step: string | null;
  /** 그 절차의 오류 원문 — 없으면 항목 실패 까닭 */
  error: string | null;
  /** game-tree.txt — 실패 순간 화면에 있던 오브젝트 목록. 파일이 없으면 null */
  tree: string | null;
  /** game-errors.txt — 케이스 동안 게임에서 난 오류 로그. 파일이 없으면 null */
  errors: string | null;
}

export async function 게임실패자료(
  서비스: number,
  runId: number,
  tcId: string,
): Promise<{ summary: string[]; game: 게임실패 } | { error: 'NO_TRACE'; detail: string }> {
  const { pool } = await import('../db/index.js');
  // 세우는 쪽(gameFix.ts)은 시간 초과로 미실행(NA)이 된 케이스도 맡는다 — FAIL 항목이 있으면 그것을, 없으면 끝난 NA 항목을 읽는다
  const 행 = (
    await pool.query<{ history_id: string; params: unknown; expected: unknown; param_schema: unknown; expected_schema: unknown }>(
      `SELECT i.history_id, i.params, i.expected, i.param_schema, i.expected_schema
         FROM run_item i JOIN test_run r ON r.run_id = i.run_id
        WHERE i.run_id = $1 AND i.tc_id = $2 AND r.service_id = $3 AND (i.status = 'FAIL' OR (i.status = 'NA' AND i.finished_at IS NOT NULL))
        ORDER BY (i.status = 'FAIL') DESC, i.history_id LIMIT 1`,
      [runId, tcId, 서비스],
    )
  ).rows[0];
  if (행 === undefined) return { error: 'NO_TRACE', detail: '그 실행에 이 케이스의 실패 항목이 없다' };
  const historyId = Number(행.history_id);
  const 항목 = await findItem(runId, historyId);
  const 비밀 = 항목비밀(행);
  // 가린 뒤에 자른다 — 먼저 자르면 잘린 자리에 걸친 비밀값 조각이 가림 무늬에 안 걸린다
  const 읽기 = async (이름: typeof GAME_TREE_FILE | typeof GAME_ERRORS_FILE): Promise<string | null> => {
    const 글 = await 게임실패파일읽기(runId, historyId, 이름);
    return 글 === null ? null : 글가린다(글, 비밀).slice(0, 파일상한);
  };
  const 실패절차 = 항목?.steps.find((s) => s.status === 'FAIL') ?? null;
  const game: 게임실패 = {
    step: 실패절차?.title ?? null,
    error: 실패절차?.error?.message ?? 항목?.failure?.reason ?? null,
    tree: await 읽기(GAME_TREE_FILE),
    errors: await 읽기(GAME_ERRORS_FILE),
  };
  const summary = [
    ...(game.step === null ? [] : [`실패한 절차: ${game.step}`]),
    ...(game.error === null ? [] : [`오류: ${game.error}`]),
  ].map((줄) => 글가린다(줄, 비밀).slice(0, 500));
  return { summary, game };
}
