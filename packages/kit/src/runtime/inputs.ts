// 러너가 환경변수로 실어 보낸 입력값·기대값을 케이스 명세로 검증해 넘긴다 (SPEC §5.2)
// 환경변수가 없으면 스키마의 기본값이 들어가므로 사람이 직접 playwright로 돌려볼 수도 있다

import type { z } from 'zod';

import { 계정채우기, 출처, type 역할계정, type 칸꼬리표 } from '../accounts.js';
import { schemasOf, type CaseHandle, type CaseSchema } from './defineCase.js';

export interface RawInputs {
  params: unknown;
  expected: unknown;
  /** 작성 · 반영 때 에이전트가 넘긴 계정 가운데 실행 주소와 출처가 같은 줄 — 비어 있는 계정 칸을 채운다 (도메인/작성 §3.6 「★ 역할별 계정」) */
  accounts?: 역할계정[];
}

/**
 * PLATFORM_ACCOUNTS(JSON `[{ baseUrl, role, loginId, loginPassword }]`) 가운데 PLATFORM_BASE_URL 과 출처가 같은 줄.
 * 둘 중 하나라도 없으면 빈 목록 — 러너 실행은 서버가 이미 계정을 채워 보낸다 (도메인/실행 §3.2)
 */
export function injectedAccounts(env: NodeJS.ProcessEnv = process.env): 역할계정[] {
  const raw = env.PLATFORM_ACCOUNTS;
  if (raw === undefined || raw.trim() === '') return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON.parse 문장은 받은 글의 앞부분을 싣는다 — 비밀번호가 로그 · 증적에 남지 않게 그 문장은 버리고 이름만 알린다
    throw new Error('PLATFORM_ACCOUNTS가 JSON이 아니다');
  }
  if (!Array.isArray(parsed)) throw new Error('PLATFORM_ACCOUNTS가 배열이 아니다');

  const origin = 출처(env.PLATFORM_BASE_URL);
  if (origin === null) return [];
  return parsed.flatMap((row: unknown, i): 역할계정[] => {
    const a = (typeof row === 'object' && row !== null ? row : {}) as Record<string, unknown>;
    if (typeof a.role !== 'string') throw new Error(`PLATFORM_ACCOUNTS ${String(i + 1)}번째 줄에 역할(role)이 없다`);
    if (출처(a.baseUrl) !== origin) return [];
    const text = (v: unknown) => (typeof v === 'string' ? v : null);
    return [{ role: a.role, loginId: text(a.loginId), loginPassword: text(a.loginPassword) }];
  });
}

export function injectedInputs(env: NodeJS.ProcessEnv = process.env): RawInputs {
  const accounts = injectedAccounts(env);
  const withAccounts = accounts.length === 0 ? {} : { accounts };
  const raw = env.PLATFORM_PARAMS;
  if (raw === undefined || raw.trim() === '') return { params: {}, expected: {}, ...withAccounts };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // 삼키면 '입력값이 왜 비었는지' 알 수 없게 된다 (CLAUDE.md §3)
    throw new Error(`PLATFORM_PARAMS가 JSON이 아니다: ${err instanceof Error ? err.message : String(err)}`);
  }

  const box = (parsed ?? {}) as { params?: unknown; expected?: unknown };
  return { params: box.params ?? {}, expected: box.expected ?? {}, ...withAccounts };
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

/**
 * 비어 있는 계정 칸을 그 역할 계정으로 채운다. 칸 꼬리표는 칸마다 `.meta()` 로 읽는다 — `.optional().meta({ secret: true })` 꼴이라 바깥에 붙는다.
 * PLATFORM_PARAMS 로 온 값이 이긴다 — `계정채우기` 는 값이 없는 칸만 채운다 (공통/2-명세선언 §4.1)
 */
function fillAccounts(schema: CaseSchema, params: unknown, accounts: readonly 역할계정[] | undefined): unknown {
  if (schema === null || accounts === undefined || accounts.length === 0) return params;
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return params;
  const tags = Object.fromEntries(
    Object.entries(schema.shape).map(([name, field]): [string, 칸꼬리표 | undefined] => {
      const meta = (field as z.ZodType).meta();
      return [name, meta === undefined ? undefined : { secret: meta.secret, account: meta.account }];
    }),
  );
  return 계정채우기(tags, params as Record<string, unknown>, accounts);
}

export function resolveInputs<P, E>(spec: CaseHandle<P, E>, raw: RawInputs): { params: P; expected: E } {
  const schema = schemasOf(spec);
  return {
    params: applySchema(schema.params, fillAccounts(schema.params, raw.params, raw.accounts), spec.tcId, '입력값') as P,
    expected: applySchema(schema.expected, raw.expected, spec.tcId, '기대값') as E,
  };
}
