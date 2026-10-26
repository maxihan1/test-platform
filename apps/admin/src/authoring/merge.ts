// 반영(MERGE) 행 하나를 세우는 판정과 넣기 — 머지 통로와 결정 진행(진행 3)이 같이 쓴다 (도메인/작성 §7 「Authoring 머지」 · 「결정 목록 통로」)

import type { PoolClient } from 'pg';

import { 반영겹침판정 } from './conflict-routes.js';
import { 머지보류판정 } from './held-routes.js';
import { 도는실행있나, 뿌리, 최신실행 } from './history.js';
import { 줄세우기, type 요청 } from './store.js';

export type 머지판정 = { error: string; code: number; detail?: string } | { id: number };

/**
 * 원본 실행 `행` 의 반영 행을 세운다. **부르는 쪽이 그 뿌리 잠금(history.ts `뿌리잠그고` 의 열쇠)을 `손` 으로 쥔 채 부른다** —
 * 판정과 넣기 사이에 재실행 · 보류 입력이 끼면 옛 PR 을 반영한다.
 * 도는 실행이 있거나 뒤에 실행이 더 있으면 그 PR 은 이미 옛것이다 — 최신 실행만 머지한다 (§7 「실행 기록」)
 */
export async function 머지세우기(
  손: PoolClient,
  행: 요청,
  서비스: number,
  env: unknown,
  사람: { username: string; displayName: string },
): Promise<머지판정> {
  // 폐기는 되살리는 통로가 없다 — 머지 행이 서면 사슬 끝이 폐기 안 된 행이 되어 목록에 되살아난다 (§7 「중단 · 폐기 · 진척」)
  if (행.discardedAt !== null) return { error: 'BAD_SOURCE', code: 409, detail: 'DISCARDED' };
  const 뿌리번호 = (await 뿌리(행.id, 손)) ?? 행.id;
  if (await 도는실행있나(뿌리번호, 손)) return { error: 'RUN_ACTIVE', code: 409 };
  if ((await 최신실행(뿌리번호, 손)) !== 행.id) return { error: 'NOT_LATEST', code: 409 };
  // 아직 안 끝났거나 실패한 요청은 머지할 것이 없다. PR 주소가 비어 있다
  if (행.status !== 'DONE' || 행.prUrl === null) return { error: 'NOT_MERGEABLE', code: 409, detail: 행.status };
  const 보류 = await 머지보류판정(행, 서비스, env, 손);
  if ('error' in 보류) return 보류;
  // 겹친 케이스를 다 고르기 전에는 반영하지 않는다 — 에이전트가 같은 겹침에서 또 멈춘다 (§3.6 「★ 반영 때 겹침 검사」)
  const 겹침 = await 반영겹침판정(손, 행.id);
  if (겹침 !== null) return 겹침;
  const id = await 줄세우기(
    {
      서비스,
      kind: 'MERGE',
      원본: 행.id,
      // ★ 기획서 본문을 복사하지 않는다. 그것은 실행 등급이 쓴 자유 텍스트이고 맥에서 도는
      // 에이전트가 읽고 따르는 지시문이다 — 머지 행에까지 실어 보내면 admin 이 승인한 것은
      // 「이 요청을 머지한다」인데 맥에게 가는 것은 그 사람이 쓴 문장이 된다.
      // 맥은 원본 번호로 필요한 것을 읽으면 된다 (2026-09-22 보안 검토가 잡았다)
      기획서: `머지 요청 — 원본 #${String(행.id)}`,
      누가: 사람.username,
      이름: 사람.displayName,
      머지대상: 보류.env,
    },
    손,
  );
  return { id };
}
