// 안정화 AI 실행 요약 결과 모양 — 끝 알리기 검사(perf/ai.ts)와 화면 읽기(view.ts · detail.ts)가 같이 쓴다 (도메인/안정화 §3.15 「AI 실행 요약」 「결과 모양」)

import { z } from 'zod';

const 한줄 = z.string().trim().min(1).max(120);
const 번호 = z.number().int().positive();

export const 요약모양 = z.object({
  headline: 한줄,
  changes: z.array(z.object({ errorId: 번호, text: 한줄 })).max(5),
  features: z.array(z.object({ name: z.string().trim().min(1).max(60), tcIds: z.array(z.string().min(1).max(100)).max(500) })).max(8),
  verified: 한줄,
  trend: 한줄,
  errors: z.array(z.object({ errorId: 번호, headline: 한줄, impact: 한줄, previous: 한줄, cause: 한줄 })).max(30),
});
export type 요약결과 = z.infer<typeof 요약모양>;

/** 재료에서 거르는 데 쓰는 것만 — 재료 전체 모양은 summary.ts 가 만든다 */
export interface 요약재료뼈대 {
  errors: { errorId: number; state: string }[];
  cases: { tcId: string }[];
}

/** 재료에 없는 번호를 버린다. 주요 변화 · 종류별 요약은 신규 · 증가 · 재발 종류만 남긴다 */
export function 요약거르기(결과: 요약결과, 재료: 요약재료뼈대): 요약결과 {
  const 바뀐종류 = new Set(재료.errors.filter((e) => e.state !== 'ONGOING').map((e) => e.errorId));
  const 케이스 = new Set(재료.cases.map((c) => c.tcId));
  return {
    ...결과,
    changes: 결과.changes.filter((c) => 바뀐종류.has(c.errorId)),
    features: 결과.features.map((f) => ({ ...f, tcIds: f.tcIds.filter((t) => 케이스.has(t)) })),
    errors: 결과.errors.filter((e) => 바뀐종류.has(e.errorId)),
  };
}
