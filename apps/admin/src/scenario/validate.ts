// 시나리오 조립을 가린다 — 부품 모양(zod)과 400 으로 거절할 조립 규칙 (SPEC 도메인/시나리오 §7)
// DB 와 파일을 모른다. 카탈로그 재료는 parts.ts 가 만들어 넘긴다

import type { Platform, ScenarioPart } from '@platform/kit';
import { z } from 'zod';

// 부품 표의 정본은 도메인/시나리오 §3.7 · 코드 값은 공유계약 §5.1 ScenarioPart 다
const 부품모양 = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('case'),
    tcId: z.string(),
    params: z.record(z.string(), z.unknown()),
    expected: z.record(z.string(), z.unknown()),
    skipSteps: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('api'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string(),
    body: z.unknown().optional(),
    expectStatus: z.number().int(),
  }),
  z.object({
    kind: z.literal('mock'),
    urlPattern: z.string(),
    status: z.number().int().min(100).max(599),
    contentType: z.string(),
    body: z.string(),
  }),
  z.object({ kind: z.literal('unmock'), urlPattern: z.string() }),
  z.object({ kind: z.literal('wait'), ms: z.number().int() }),
]);

export const 부품들모양: z.ZodType<ScenarioPart[]> = z.array(부품모양);

export type 카탈로그 = Map<string, { platforms: Platform[]; isActive: boolean; skippable: string[] }>;

const 케이스몫 = 300000;
const 대기상한 = 60000;
const 제한시간상한 = 3600000;

/** 러너에 넘길 제한 시간. ③ 이 `timeoutMs` 로 쓴다 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」) */
export function 시나리오제한시간(parts: ScenarioPart[]): number {
  return parts.reduce((합, p) => 합 + (p.kind === 'case' ? 케이스몫 : p.kind === 'wait' ? p.ms : 0), 0);
}

/** 거절 사유를 사람 말로 모은다. 비면 통과다. 되돌리기는 이것을 안 건다 (§7 restore) */
export function 조립검사(parts: ScenarioPart[], platform: Platform, service: string, 재료: 카탈로그): string[] {
  if (parts.length === 0) return ['부품이 하나도 없다'];

  const 오류: string[] = [];
  const 켜진모킹 = new Set<string>();
  parts.forEach((p, i) => {
    const 자리 = `${i + 1}번 부품`;
    if (p.kind === 'case') {
      // 접두사부터 본다 — 남의 서비스 케이스가 있는지 없는지가 오류 문장으로 새지 않게
      if (!p.tcId.startsWith(`${service}-`)) {
        오류.push(`${자리}: ${p.tcId} 는 ${service} 서비스의 케이스가 아니다`);
        return;
      }
      const 케이스 = 재료.get(p.tcId);
      if (케이스 === undefined || !케이스.isActive) {
        오류.push(`${자리}: ${p.tcId} 는 없거나 비활성인 케이스다`);
        return;
      }
      if (!케이스.platforms.includes(platform)) 오류.push(`${자리}: ${p.tcId} 는 ${platform} 을 선언하지 않았다`);
      for (const 제목 of p.skipSteps) {
        if (!케이스.skippable.includes(제목)) 오류.push(`${자리}: 「${제목}」 은 건너뛸 수 있는 절차가 아니다`);
      }
    } else if (p.kind === 'api') {
      // `//host` 는 다른 호스트로 풀린다 — 대상 주소 밖으로 못 나가게 한다
      if (!p.path.startsWith('/') || p.path.startsWith('//')) {
        오류.push(`${자리}: API 경로는 / 로 시작하고 // 로 시작하지 않아야 한다`);
      }
    } else if (p.kind === 'mock') {
      켜진모킹.add(p.urlPattern);
    } else if (p.kind === 'unmock') {
      if (!켜진모킹.delete(p.urlPattern)) 오류.push(`${자리}: 켜져 있는 「${p.urlPattern}」 모킹이 없다`);
    } else if (p.ms <= 0 || p.ms > 대기상한) {
      오류.push(`${자리}: 대기는 1ms 부터 ${대기상한}ms 까지다`);
    }
  });

  const 합 = 시나리오제한시간(parts);
  if (합 > 제한시간상한) 오류.push(`제한 시간 합이 ${합}ms 로 ${제한시간상한}ms 를 넘는다`);
  return 오류;
}
