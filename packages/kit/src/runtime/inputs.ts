// 러너가 환경변수로 실어 보낸 입력값·기대값을 케이스 명세로 검증해 넘긴다 (SPEC §5.2)
// 환경변수가 없으면 스키마의 기본값이 들어가므로 사람이 직접 playwright로 돌려볼 수도 있다

import type { z } from 'zod';

import { schemasOf, type CaseHandle, type CaseSchema } from './defineCase.js';

export interface RawInputs {
  params: unknown;
  expected: unknown;
}

export function injectedInputs(env: NodeJS.ProcessEnv = process.env): RawInputs {
  const raw = env.PLATFORM_PARAMS;
  if (raw === undefined || raw.trim() === '') return { params: {}, expected: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // 삼키면 '입력값이 왜 비었는지' 알 수 없게 된다 (CLAUDE.md §3)
    throw new Error(`PLATFORM_PARAMS가 JSON이 아니다: ${err instanceof Error ? err.message : String(err)}`);
  }

  const box = (parsed ?? {}) as { params?: unknown; expected?: unknown };
  return { params: box.params ?? {}, expected: box.expected ?? {} };
}

function describeIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(전체)'} — ${i.message}`).join(', ');
}

function applySchema(schema: CaseSchema, value: unknown, tcId: string, label: string): unknown {
  // 없다고 적은 케이스에는 빈 객체를 넘긴다 (SPEC §4)
  if (schema === null) return {};

  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    throw new Error(`${tcId}의 ${label}이 명세와 맞지 않는다: ${describeIssues(result.error)}`);
  }
  return result.data;
}

export function resolveInputs<P, E>(spec: CaseHandle<P, E>, raw: RawInputs): { params: P; expected: E } {
  const schema = schemasOf(spec);
  return {
    params: applySchema(schema.params, raw.params, spec.tcId, '입력값') as P,
    expected: applySchema(schema.expected, raw.expected, spec.tcId, '기대값') as E,
  };
}
