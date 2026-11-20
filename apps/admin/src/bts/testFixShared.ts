// 「테스트 수정」 바퀴의 BTS 줄과 게임 줄이 같이 쓰는 조각 — 반영이 끝났나 · 디바이스 이름 · 다시 실행 표시 (도메인/BTS §3.12 · 도메인/게임 §3.10 「실패 자동 수정」)
// testFixRerun.ts 와 gameFixRerun.ts 가 서로를 가져오지 않게 따로 둔다

import type { Pool } from 'pg';

import { 사슬식 } from '../authoring/chainSql.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 고침 작성의 반영이 끝났나 — 사슬에 끝난 반영이 있다 */
export async function 반영끝났나(뿌리: string): Promise<boolean> {
  const r = await (await db()).query(
    `WITH RECURSIVE ${사슬식('id = $1')} SELECT 1 FROM 사슬 s JOIN authoring_request a ON a.id = s.id WHERE a.kind = 'MERGE' AND a.status = 'DONE' LIMIT 1`,
    [뿌리],
  );
  return (r.rowCount ?? 0) > 0;
}

export const 디바이스이름 = (platform: string, real: boolean): string => (platform === 'desktop' ? 'PC' : platform === 'android' ? 'Android 앱' : real ? '실제 폰' : '모바일');

/**
 * 댓글의 「RUN N」 과 다음 줄 고리 — 사람이 화면에서 찾을 수 있는 실행이다. 붙은 한 건은 붙은 실행(그 화면에 결과가 바꿔 끼워진다),
 * 붙을 곳이 없던 한 건은 결과 화면이 없어 번호만, 반복 실행에 걸려 새로 선 실행은 그 실행이다
 */
export function 실행표시(실행: { run_id: string; origin: string; rerun_of: string | null }): string {
  const 한건 = 실행.origin === 'SINGLE';
  const 번호 = 한건 ? (실행.rerun_of ?? 실행.run_id) : 실행.run_id;
  const 주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  return 주소 === '' || (한건 && 실행.rerun_of === null) ? `RUN ${번호}` : `RUN ${번호}\n${주소}/#/runs/${번호}`;
}
