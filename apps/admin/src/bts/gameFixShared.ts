// 게임 실패 자동 수정이 세우는 고침 요청의 약속 — 요청자 · params.testFix · result.testFix.cases 꼴 (도메인/게임 §3.10 「실패 자동 수정」 · GAME-F5-12)
// 바퀴(bts/testFix*.ts) · 표시(testFixView.ts) · 작성 목록(listSummary.ts) · 에이전트 통로가 같이 읽는다 — 서로 가져오기 고리가 생기지 않게 따로 둔다

import { z } from 'zod';

/** 서버가 스스로 세운 요청의 요청자 — 작성 목록 작성자는 「Agent」로 보인다. 자동 반영도 이 이름으로 세운다 */
export const 게임수정요청자 = { 누가: 'agent', 이름: 'Agent' } as const;

export const 조작실패들 = ['notFound', 'timeout'] as const;
export type 조작실패 = (typeof 조작실패들)[number];

/** params.testFix — 게임 실패 자동 수정. issueKey 가 없고 auto 가 true 다. cases 는 한 실행의 조작 실패 케이스들 */
export const 게임고침틀 = z.object({
  auto: z.literal(true),
  cases: z.array(z.object({ runId: z.number().int(), tcId: z.string(), env: z.string(), failure: z.enum(조작실패들) })).min(1),
  note: z.string(),
});
export type 게임고침 = z.infer<typeof 게임고침틀>;

/** params 가 게임 실패 자동 수정 요청인가 — 재실행 · 이어서 작성은 원본 params 를 물려받는다 */
export function 게임고침인가(params: unknown): boolean {
  return (params as { testFix?: { auto?: unknown } } | null)?.testFix?.auto === true;
}

/**
 * result.testFix.cases — 게임 고침 자식이 케이스마다 남긴 끝(GAME-F5-13 이 채운다). FIXED 는 PR 에 든 고침,
 * FLAKY 는 그대로 돌려 보니 통과해 안 고침, NOT_FOUND 는 「수정할 곳을 찾지 못했어요」 — note 에 본 것 한 줄
 */
export const 게임고침끝들 = ['FIXED', 'FLAKY', 'NOT_FOUND'] as const;
export const 케이스끝틀 = z.array(z.object({ tcId: z.string(), outcome: z.enum(게임고침끝들), note: z.string().max(300).optional() }));
export type 케이스끝 = z.infer<typeof 케이스끝틀>[number];

/** 끝내기 result 에서 케이스마다의 끝 — 칸이 없거나 꼴이 틀리면 null(앞 판 에이전트 · 모름) */
export function 케이스끝읽기(결과: unknown): 케이스끝[] | null {
  const r = 케이스끝틀.safeParse((결과 as { testFix?: { cases?: unknown } } | null)?.testFix?.cases);
  return r.success ? r.data : null;
}

/** 한 실행에서 맡는 조작 실패 수 상한 — 넘으면 빌드나 폰이 깨진 것으로 보고 안 세운다(2026-11-20 GAME-F5-12 시작 질문 — RUN 21154 284건에서 5건) */
export const 맡을상한 = 10;
