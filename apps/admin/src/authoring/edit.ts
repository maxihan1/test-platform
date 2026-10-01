// 케이스 고치기 요청 본문 검사 — 지우기 · 기대값 넣기 · 미확정 풀기 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」)

import type { JsonSchema } from '@platform/kit';

import { validate } from '../execution/validate.js';

/** 한 요청의 케이스 수 상한 — 명세 작성 §3.6 「★ 케이스 고치기」가 정본 */
export const 고치기상한 = 50;

export type 기대값 = string | number | boolean;

export type 고칠것 =
  | { tcId: string; delete: true }
  | { tcId: string; expected?: Record<string, 기대값>; confirm?: true };

export interface 케이스정보 {
  tcId: string;
  active: boolean;
  unconfirmed: string | null;
  expectedSchema: unknown;
}

export interface 고치기판 {
  케이스들: Map<string, 케이스정보>;
  접두사: string;
  /** 그 서비스 테스트 계정의 비밀번호들. 기대값이 이것과 같으면 원문이 git 에 박힌다 */
  비밀번호들: string[];
}

export type 고치기결과 = { edits: 고칠것[] } | { error: 'BAD_EDIT'; detail: string };

/**
 * `별칭` 행이 「고치기 실행」인가 — SQL 참거짓 식. 케이스 고치기와 그 다시 적용 행만 `params.edits` 를 가진다.
 * 중단 · 폐기 · 이어하기 · 저장값 지우기가 이것 하나로 가른다 — 자리마다 kind 로 따로 가르면 다시 적용 행을 빠뜨린다
 */
export function 고치기실행식(별칭: string): string {
  return `(${별칭}.params ? 'edits')`;
}

/** 위 식과 같은 판정을 읽은 행에 */
export function 고치기실행인가(행: { params: unknown }): boolean {
  return isPlainObject(행.params) && Object.hasOwn(행.params, 'edits');
}

/** 행 params 의 edits. 고치기 실행이 아니면 null — 집기 응답과 반영 뒤 저장값 지우기가 같이 읽는다 */
export function 행의고칠것(params: unknown): unknown[] | null {
  return isPlainObject(params) && Array.isArray(params.edits) ? params.edits : null;
}

// 정본은 catalog/rules.ts 의 SECRET_NAMES 다 — 그쪽은 검사기 묶음이라 import 하면 화면 쪽 의존이 딸려 온다.
// collect.ts 와 같은 이유로 같은 목록을 둔다. 이름만 비밀값이고 표시가 없는 옛 케이스를 여기서도 막는다
const SECRET_NAMES = ['password', 'passwd', 'pw', 'token', 'secret', 'apikey', 'credential'];

const 키들 = new Set(['tcId', 'delete', 'expected', 'confirm']);
const 단순타입 = new Set(['string', 'number', 'integer', 'boolean']);

class 거절 extends Error {
  constructor(readonly detail: string) {
    super(detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function 비밀칸인가(field: string, prop: Record<string, unknown>): boolean {
  if (prop.secret === true) return true;
  const lower = field.toLowerCase();
  return SECRET_NAMES.some((word) => lower.includes(word));
}

// 에이전트가 코드에 `.default(값)` 한 줄로 적을 수 있는 칸만 받는다.
// 객체 · 배열 · anyOf 는 값 하나로 적을 모양이 정해지지 않아 사람이 코드를 직접 고쳐야 한다
function 적을수있는칸인가(prop: Record<string, unknown>): boolean {
  if ('anyOf' in prop || 'oneOf' in prop || 'allOf' in prop) return false;
  if ('enum' in prop) {
    const 목록 = prop.enum;
    return (
      Array.isArray(목록) &&
      목록.length > 0 &&
      목록.every((v) => typeof v === 'string') &&
      (prop.type === undefined || prop.type === 'string')
    );
  }
  return typeof prop.type === 'string' && 단순타입.has(prop.type);
}

function 값맞나(field: string, prop: Record<string, unknown>, value: unknown, 비밀번호들: string[]): boolean {
  if (typeof value === 'number' && !Number.isFinite(value)) return false;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return false;
  // 테스트 계정 비밀번호를 기대값으로 받으면 케이스 파일을 거쳐 원문이 저장소 이력에 남는다
  if (typeof value === 'string' && 비밀번호들.includes(value)) return false;
  // required 를 안 넘기므로 형식 · enum · 길이 · 범위만 본다
  const schema: JsonSchema = { type: 'object', properties: { [field]: prop } };
  return validate(schema, { [field]: value }).length === 0;
}

function 기대값검사(tcId: string, expected: unknown, 케이스: 케이스정보, 비밀번호들: string[]): Record<string, 기대값> {
  if (!isPlainObject(expected) || Object.keys(expected).length === 0) throw new 거절(tcId);
  const schema = 케이스.expectedSchema;
  const properties = isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};
  const 결과: [string, 기대값][] = [];
  for (const [field, value] of Object.entries(expected)) {
    // hasOwn 으로 본다 — `constructor` 같은 상속 키를 명세의 칸으로 착각하지 않게
    const prop = Object.hasOwn(properties, field) ? properties[field] : undefined;
    const ok =
      isPlainObject(prop) &&
      !비밀칸인가(field, prop) &&
      적을수있는칸인가(prop) &&
      값맞나(field, prop, value, 비밀번호들);
    if (!ok) throw new 거절(`${tcId}.${field}`);
    결과.push([field, value as 기대값]);
  }
  // fromEntries 는 `__proto__` 같은 이름도 자기 키로 만든다. 대입으로 쌓으면 프로토타입이 바뀐다
  return Object.fromEntries(결과);
}

function 줄검사(item: unknown, 판: 고치기판, 본것: Set<string>): 고칠것 {
  if (!isPlainObject(item) || typeof item.tcId !== 'string') throw new 거절('');
  const tcId = item.tcId;
  const 케이스 = 판.케이스들.get(tcId);
  if (
    Object.keys(item).some((k) => !키들.has(k)) ||
    케이스 === undefined ||
    !케이스.active ||
    !tcId.startsWith(`${판.접두사}-`) ||
    본것.has(tcId)
  ) {
    throw new 거절(tcId);
  }
  본것.add(tcId);

  if ('delete' in item) {
    // 지우기는 다른 고침과 섞지 않는다 — 지운 파일에 기대값을 쓸 수 없다
    if (item.delete !== true || Object.keys(item).length !== 2) throw new 거절(tcId);
    return { tcId, delete: true };
  }

  const 있나기대 = 'expected' in item;
  const 있나확정 = 'confirm' in item;
  if (!있나기대 && !있나확정) throw new 거절(tcId);

  const 고침: { tcId: string; expected?: Record<string, 기대값>; confirm?: true } = { tcId };
  if (있나기대) 고침.expected = 기대값검사(tcId, item.expected, 케이스, 판.비밀번호들);
  if (있나확정) {
    // 미확정 꼬리표가 없는 케이스는 풀 것이 없다. 조용히 넘기면 사람은 확정했다고 믿는다
    if (item.confirm !== true || 케이스.unconfirmed === null) throw new 거절(tcId);
    고침.confirm = true;
  }
  return 고침;
}

/** 고치기 요청 본문을 검사해 입력 순서 그대로 정규화한다. 한 줄이라도 틀리면 전체를 거절한다 */
export function 고칠것검사(본문: unknown, 판: 고치기판): 고치기결과 {
  if (!isPlainObject(본문) || !Array.isArray(본문.edits)) return { error: 'BAD_EDIT', detail: '' };
  const items: unknown[] = 본문.edits;
  if (items.length === 0 || items.length > 고치기상한) return { error: 'BAD_EDIT', detail: '' };

  const 본것 = new Set<string>();
  try {
    return { edits: items.map((item) => 줄검사(item, 판, 본것)) };
  } catch (e) {
    if (e instanceof 거절) return { error: 'BAD_EDIT', detail: e.detail };
    throw e;
  }
}
