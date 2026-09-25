// 테스트 코드 안의 명세 선언. 이 선언 하나가 입력 폼·검증·증적 문서를 전부 만든다 (SPEC §4)

import { relative, resolve } from 'node:path';

import { z } from 'zod';

import type { CaseSpec, JsonSchema, Platform, TcId } from '../types.js';
import { callerFile } from './callsite.js';

// 입력값·기대값 자리에 올 수 있는 것. 없으면 null로 '없다고 적는다' (SPEC §4)
export type CaseSchema = z.ZodObject | null;

type Shape<S> = S extends z.ZodObject ? z.infer<S> : Record<string, never>;

export interface CaseHandle<P, E> extends CaseSpec {
  // 타입 추론 전용 자리. 값이 들어가지 않으므로 JSON으로 내보내도 나오지 않는다
  readonly __types?: { params: P; expected: E };
}

export interface DefineCaseInput<P extends CaseSchema, E extends CaseSchema> {
  tcId: TcId;
  name: string;
  platforms?: Platform[];
  precondition: string[];
  params: P;
  expected: E;
  unconfirmed?: string;
}

// 선언에 쓴 zod 스키마 원본. 실행 시점에 주입값을 검증하려면 JSON Schema가 아니라 원본이 필요하다.
// 명세 객체에 직접 달면 스캐너가 JSON으로 내보낼 때 딸려 나가므로 바깥에 따로 보관한다
const schemas = new WeakMap<CaseSpec, { params: CaseSchema; expected: CaseSchema }>();

export function schemasOf(spec: CaseSpec): { params: CaseSchema; expected: CaseSchema } {
  return schemas.get(spec) ?? { params: null, expected: null };
}

function toJsonSchema(schema: CaseSchema): JsonSchema {
  // 없다고 적은 자리는 빈 객체 스키마가 된다. 화면은 입력칸을 만들지 않고 문서는 '입력 없음'으로 쓴다 (SPEC §4)
  if (schema === null) return { type: 'object', properties: {} };
  // zod 4부터 변환기가 zod 안에 들어왔다. io:'input'이라야 기본값이 있는 필드가 required에서 빠진다
  return z.toJSONSchema(schema, { io: 'input' }) as JsonSchema;
}

function testsRoot(): string {
  return process.env.PLATFORM_TESTS_DIR ?? resolve(process.cwd(), 'tests');
}

export function defineCase<P extends CaseSchema, E extends CaseSchema>(
  input: DefineCaseInput<P, E>,
): CaseHandle<Shape<P>, Shape<E>> {
  // 선언이 적힌 파일이 곧 케이스 파일이다. defineCase 자신의 프레임을 지워야 첫 프레임이 그 파일이 된다
  const here = new Error();
  Error.captureStackTrace(here, defineCase);
  const file = callerFile(here);

  const spec: CaseSpec = {
    tcId: input.tcId,
    name: input.name,
    platforms: input.platforms === undefined || input.platforms.length === 0 ? ['desktop'] : input.platforms,
    precondition: input.precondition,
    paramSchema: toJsonSchema(input.params),
    expectedSchema: toJsonSchema(input.expected),
    filePath: file === undefined ? '' : relative(testsRoot(), file),
  };
  // 빈 사유는 확정이다. 키를 아예 빼야 스캐너 JSON 에 빈 칸이 섞이지 않는다
  if (input.unconfirmed?.trim()) spec.unconfirmed = input.unconfirmed;

  schemas.set(spec, { params: input.params, expected: input.expected });

  return spec;
}
