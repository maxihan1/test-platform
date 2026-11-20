// 작성이 찾은 돌발 팝업 행 — 끝 보고(result.popupRows)에 실려 오고, 그 PR 이 병합(반영 DONE)되면 조작 맵에 올린다 (도메인/게임 §3.10 「돌발 팝업 자동 닫기」 · GAME-F5-15)
// PR 을 보기 전에 올리면 오류 창을 팝업으로 잘못 적었을 때 다음 정식 실행부터 kit 이 그 창을 닫아 실패가 통과가 된다 — 병합을 사람 확인으로 삼는다

import { type 읽는손, 고침이팝업을올렸나, 조작행검사, 행넣기 } from './gameRoute.js';

// 실행 요청에 싣는 돌발 팝업 상한(gameRoute.ts 팝업상한 · 러너 돌발팝업상한)과 같다 — 넘게 올려도 정식 실행이 다 싣지 못한다
const 상한 = 100;

/** 끝 보고의 result.popupRows 가 맞나 — 작성(AUTHOR · RERUN)의 DONE 만, 테스트 고침이 아닌 요청만, 「확인」 POPUP 행만 */
export function 끝내기팝업맞나(kind: string, status: string, params: unknown, v: unknown): boolean {
  if (v === undefined) return true;
  if (status !== 'DONE' || (kind !== 'AUTHOR' && kind !== 'RERUN')) return false;
  if (!Array.isArray(v) || v.length === 0 || v.length > 상한) return false;
  const 읽음 = 조작행검사({ rows: v });
  if ('error' in 읽음) return false;
  return 고침이팝업을올렸나(params, 읽음.rows) === null && 읽음.rows.every((r) => r.kind === 'POPUP' && r.status === 'OK');
}

/**
 * 반영(MERGE)이 DONE 으로 끝날 때 — 병합된 실행(반영의 원본)이 실어 온 팝업 행을 그 게임 애플리케이션 맵에 올린다. 끝내기와 같은 트랜잭션이다.
 * 원본만 본다 — PR 머리의 「병합하면 올릴 돌발 팝업 행」 줄이 그 실행 것이라 사람이 본 목록과 올리는 목록이 같다
 */
export async function 병합뒤팝업올리기(손: 읽는손, 원본: number | null): Promise<number> {
  if (원본 === null) return 0;
  const r = await 손.query<{ service_id: number; rows: unknown }>(
    `SELECT a.service_id, a.result->'popupRows' AS rows FROM authoring_request a JOIN service s ON s.id = a.service_id
      WHERE a.id = $1 AND s.kind = 'GAME' AND jsonb_typeof(a.result->'popupRows') = 'array'`,
    [원본],
  );
  const 줄 = r.rows[0];
  if (줄 === undefined) return 0;
  const 읽음 = 조작행검사({ rows: 줄.rows });
  // 끝 보고 때 본 행이다 — 그 뒤 꼴 규칙이 좁아져 못 읽으면 반영은 그대로 끝내고 까닭만 남긴다
  if ('error' in 읽음) {
    console.warn(`[admin] ${String(원본)}번 작성의 돌발 팝업 행을 못 읽어 맵에 안 올린다 — ${읽음.detail}`);
    return 0;
  }
  const 팝업 = 읽음.rows.filter((x) => x.kind === 'POPUP' && x.status === 'OK');
  await 행넣기(손, 줄.service_id, 팝업, []);
  return 팝업.length;
}
