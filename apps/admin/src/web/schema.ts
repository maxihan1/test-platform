// paramSchema·expectedSchema를 읽어 입력 칸을 만든다 (SPEC §8.2, DESIGN.md 폼 자동 생성 규칙)
// 스키마는 zod 4의 z.toJSONSchema(schema, { io: 'input' }) 결과다. io가 input이라 .default()가 붙은 칸은 required에 없다

import type { JsonSchema } from './api.js';

export type FieldKind = 'text' | 'number' | 'boolean' | 'enum';

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  /** 라벨 옆에 '선택'을 붙일 칸. 비워 두면 보내지 않는다 */
  optional: boolean;
  options?: string[];
  default?: unknown;
}

interface Prop {
  type?: string;
  enum?: unknown[];
  description?: string;
  default?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function kindOf(prop: Prop): FieldKind {
  if (Array.isArray(prop.enum)) return 'enum';
  if (prop.type === 'boolean') return 'boolean';
  if (prop.type === 'number' || prop.type === 'integer') return 'number';
  return 'text';
}

export function schemaToFields(schema: JsonSchema): Field[] {
  const properties = isPlainObject(schema.properties) ? schema.properties : {};
  const required = (Array.isArray(schema.required) ? schema.required : []).filter(
    (key): key is string => typeof key === 'string',
  );

  return Object.entries(properties).map(([key, raw]) => {
    const prop: Prop = isPlainObject(raw) ? raw : {};
    const isRequired = required.includes(key);

    return {
      key,
      // K4가 모든 칸에 .describe()를 강제한다. 그래도 없으면 코드의 칸 이름이라도 보여준다
      label: typeof prop.description === 'string' && prop.description !== '' ? prop.description : key,
      kind: kindOf(prop),
      required: isRequired,
      // default가 있으면 값이 이미 정해져 있다. 사람이 비워 두기로 고른 칸이 아니다
      optional: !isRequired && prop.default === undefined,
      ...(Array.isArray(prop.enum) ? { options: prop.enum.map(String) } : {}),
      ...(prop.default === undefined ? {} : { default: prop.default }),
    };
  });
}

/** 폼이 들고 있는 상태는 전부 글자다. 칸마다 시작값을 만든다 */
export function initialText(fields: Field[]): Record<string, string> {
  const text: Record<string, string> = {};
  for (const field of fields) {
    text[field.key] = field.default === undefined ? '' : String(field.default);
  }
  return text;
}

/** 글자로 들고 있던 값을 명세의 타입으로 되돌린다. 되돌릴 수 없으면 글자 그대로 둬서 검증기가 사유를 내게 한다 */
export function toValues(fields: Field[], text: Record<string, string>): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = text[field.key] ?? '';
    // 선택 입력을 비워 뒀으면 칸 자체를 보내지 않는다. 빈 글자를 보내면 선언에 없는 값이 들어간다
    if (raw === '' && field.optional) continue;

    if (field.kind === 'boolean') {
      values[field.key] = raw === 'true';
      continue;
    }

    if (field.kind === 'number') {
      // Number('')는 0이다. 빈 칸을 0으로 바꿔 보내면 사람이 안 적은 값이 적힌 것으로 남는다
      const asNumber = raw.trim() === '' ? Number.NaN : Number(raw);
      values[field.key] = Number.isFinite(asNumber) ? asNumber : raw;
      continue;
    }

    values[field.key] = raw;
  }

  return values;
}
