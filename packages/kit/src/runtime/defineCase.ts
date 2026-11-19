// 테스트 코드 안의 명세 선언. 이 선언 하나가 입력 폼·검증·증적 문서를 전부 만든다 (SPEC §4)

import { relative, resolve } from 'node:path';

import { z } from 'zod';

import { PC항목인가, TECHNIQUES } from '../types.js';
import type { CaseSpec, JsonSchema, Platform, TcId, Technique } from '../types.js';
import type { AppLaunchIntent } from './app.js';
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
  held?: string;
  techniques?: Technique[];
  // API 케이스만 · 케이스를 만든 API 문서 판. 실행 때 그 판과 응답 모양을 견준다 (공통/2 §4 「API 케이스」)
  apiDoc?: number;
  // 게임 케이스만 · 닿는 게임 요소 열쇠. 빠른 검사가 게임 지도에 있는지 본다 (공통/3-공유계약 「게임 테스트 타입」)
  elements?: string[];
  // 빌드마다 먼저 도는 핵심 경로 케이스 (도메인/게임 §3.10 「빌드마다 돌리기」)
  smoke?: boolean;
  // 앱 케이스만 · 연결 때 앱 데이터를 지우지 않고 앱만 다시 켠다 — 앞 케이스의 로그인을 이어 쓴다. 안 적으면 지우고 시작한다 (도메인/러너 §5.2 「데이터 남기고 시작」)
  keepAppData?: boolean;
  // 앱 케이스만 · 켤 때 실을 값을 그 케이스의 입력값으로 만든다 — 디버그 앱의 테스트 입구로 로그인된 채 켠다. E2E 단계는 보지 않는다 (도메인/러너 §5.2 「값을 실어 켜기」)
  launchIntent?: (params: Shape<P>) => Promise<AppLaunchIntent>;
}

// 선언에 쓴 zod 스키마 원본. 실행 시점에 주입값을 검증하려면 JSON Schema가 아니라 원본이 필요하다.
// 명세 객체에 직접 달면 스캐너가 JSON으로 내보낼 때 딸려 나가므로 바깥에 따로 보관한다
const schemas = new WeakMap<CaseSpec, { params: CaseSchema; expected: CaseSchema }>();

// 연결 설정만 고르는 값이라 명세(스캐너 JSON · DB)에 싣지 않는다 — schemas 와 같은 까닭으로 바깥에 둔다
const keepers = new WeakSet<CaseSpec>();

/** 그 디바이스(Playwright 프로젝트)를 선언했나 — windows 를 선언한 케이스는 패드 값 다섯 어느 것으로도 돈다 (도메인/게임 §3.10 결정 27) */
export function 선언했나(platforms: readonly Platform[], 디바이스: string): boolean {
  return platforms.some((p) => p === 디바이스 || (p === 'windows' && PC항목인가(디바이스)));
}

export function keepsAppData(spec: CaseSpec): boolean {
  return keepers.has(spec);
}

const launchers = new WeakMap<CaseSpec, (params: never) => Promise<AppLaunchIntent>>();

/** 케이스가 고른 「실어 켤 값」. 못 만들면 알리고 undefined — 케이스는 그냥 켠 앱에서 화면으로 로그인한다 */
export async function 실어켤값(spec: CaseSpec, params: unknown): Promise<AppLaunchIntent | undefined> {
  const 만들기 = launchers.get(spec);
  if (만들기 === undefined) return undefined;
  try {
    return await 만들기(params as never);
  } catch (err) {
    console.error(`[kit] ${spec.tcId}: 실어 켤 값을 만들지 못해 그냥 켠다 — ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

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

  // 패드는 실행 창에서 고른다 — 선언에 적으면 그 패드 하나로만 돈다 (공통/3-공유계약 「윈도우 PC 게임」)
  if (input.platforms?.some((p) => p !== 'windows' && PC항목인가(p))) {
    throw new Error(`${input.tcId}: 패드는 실행할 때 고른다 — platforms 에는 windows 만 적는다`);
  }
  // 앱 · 게임 케이스는 브라우저 없이 돌아 한 선언에 브라우저 디바이스와 섞으면 몸통이 page 와 driver · game 중 무엇을 쓸지 정할 수 없다.
  // android · windows 는 같은 게임 케이스가 폰과 PC 에서 도는 것이라 같이 적는다
  const 앱쪽 = input.platforms?.filter((p) => p === 'android' || p === 'windows').length ?? 0;
  if (앱쪽 > 0 && input.platforms !== undefined && 앱쪽 < input.platforms.length) {
    throw new Error(`${input.tcId}: android · windows 는 desktop · mobile 과 함께 선언하지 않는다`);
  }

  // 브라우저 케이스에는 지울 앱 데이터가 없다 — 적어 두면 읽는 사람이 로그인이 남는 줄 안다
  if (input.keepAppData === true && !input.platforms?.includes('android')) {
    throw new Error(`${input.tcId}: keepAppData 는 android 케이스에만 단다`);
  }
  if (input.launchIntent !== undefined && !input.platforms?.includes('android')) {
    throw new Error(`${input.tcId}: launchIntent 는 android 케이스에만 단다`);
  }

  if (input.apiDoc !== undefined) {
    if (!Number.isInteger(input.apiDoc) || input.apiDoc < 1) throw new Error(`${input.tcId}: apiDoc 은 1 이상의 정수여야 한다`);
    // 같은 API 를 디바이스마다 두 번 부르는 항목이 생기지 않게 (도메인/API §3.8 「꼬리표와 다르다」)
    if (input.platforms !== undefined && input.platforms.some((p) => p !== 'desktop')) {
      throw new Error(`${input.tcId}: apiDoc 을 단 케이스의 platforms 는 desktop 하나다`);
    }
  }

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
  if (input.held?.trim()) spec.held = input.held;
  // 적은 차례가 달라도 DB · 엑셀에 같은 글자로 남게 목록 차례로 맞춘다
  const techniques = TECHNIQUES.filter((t) => input.techniques?.includes(t));
  if (techniques.length > 0) spec.techniques = techniques;
  if (input.apiDoc !== undefined) spec.apiDoc = input.apiDoc;
  // techniques 와 같은 까닭으로 겹침을 빼고 차례를 맞춘다
  const elements = [...new Set(input.elements ?? [])].filter((e) => e !== '').sort();
  if (elements.length > 0) spec.elements = elements;
  if (input.smoke === true) spec.smoke = true;

  schemas.set(spec, { params: input.params, expected: input.expected });
  if (input.keepAppData === true) keepers.add(spec);
  if (input.launchIntent !== undefined) launchers.set(spec, input.launchIntent);

  return spec;
}
