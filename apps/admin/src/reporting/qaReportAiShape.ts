// QA 리포트 남은 리스크 AI 결과 모양 · 글 짓기 — 성능 AI 일 검사(perf/ai.ts)와 리포트가 같이 쓰는 순수 함수 (도메인/리포팅 §3.17 「남은 리스크 — AI」)

import { z } from 'zod';

const 리스크줄 = z.object({
  text: z.string().trim().min(1).max(300),
  // 근거 케이스 · 이슈 · 실행 번호. 재료 밖에서 MCP 로 찾은 번호도 있어 있는지까지는 안 본다
  refs: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
});

export const 리스크모양 = z.object({
  functional: z.array(리스크줄).max(10),
  nonFunctional: z.array(리스크줄).max(10),
});
export type 리스크결과 = z.infer<typeof 리스크모양>;

export const 묶음머리 = { functional: '기능 리스크', nonFunctional: '비기능 리스크' } as const;
export const 리스크없음 = '확인된 리스크 없음';

// 배포 판단은 사람이 한다(§3.17 결정 10) — 프롬프트로 막고, 그래도 쓰면 결과를 받지 않는다
const 판단말 = /(배포|출시|릴리스|릴리즈)\s*(가능|불가|보류|해도|하셔도|권장)|go\s*\/\s*no[\s-]?go|no[\s-]?go\b/i;

/** 두 묶음을 개조식 글 하나로 — 사람이 고치는 칸이 글 하나라 처음 글도 같은 꼴로 둔다 */
export function 리스크글(r: 리스크결과): string {
  const 묶음 = (k: keyof typeof 묶음머리) => [
    묶음머리[k],
    ...(r[k].length === 0 ? [`- ${리스크없음}`] : r[k].map((x) => `- ${x.text.replace(/\s+/g, ' ')}${x.refs.length === 0 ? '' : ` (${x.refs.join(' · ')})`}`)),
  ];
  return [...묶음('functional'), ...묶음('nonFunctional')].join('\n');
}

/** 모양을 지난 결과를 다듬는다. 판단 말이 섞였으면 까닭 */
export function 리스크거르기(r: 리스크결과): { output: 리스크결과 & { text: string } } | { error: string } {
  const 글 = 리스크글(r);
  if (판단말.test(글)) return { error: '배포 판단 말이 들어 있습니다' };
  return { output: { ...r, text: 글 } };
}
