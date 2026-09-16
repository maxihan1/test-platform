// 입력값이 케이스 명세와 맞는지 본다. 명세는 zod 4가 뱉은 JSON Schema로 DB에 들어 있다 (SPEC §5.1)
// 검사기를 새로 깔지 않고 직접 쓰는 이유는 zod가 내는 모양이 좁기 때문이다.
// 모르는 키워드는 막지 않고 통과시킨다 — 명세가 더 풍부해졌을 때 저장이 막히면 사람이 손쓸 자리가 없다

import type { JsonSchema } from '@platform/kit';

export interface Violation {
  path: string;    // 어긋난 칸 이름. 화면이 이 칸 아래에 사유를 붙인다 (SPEC §8.2)
  message: string;
}

interface Field {
  type?: string;
  enum?: unknown[];
  description?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

const TYPE_NAME: Record<string, string> = {
  string: '글자',
  number: '숫자',
  integer: '정수',
  boolean: '예/아니오',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 사람이 읽을 칸 이름. describe를 안 달면 코드의 키 이름이라도 보여준다 (K4가 describe를 강제한다)
function label(key: string, field: Field): string {
  return field.description === undefined ? key : `${field.description}(${key})`;
}

function typeMismatch(value: unknown, type: string): boolean {
  switch (type) {
    case 'string': return typeof value !== 'string';
    case 'number': return typeof value !== 'number' || Number.isNaN(value);
    case 'integer': return typeof value !== 'number' || !Number.isInteger(value);
    case 'boolean': return typeof value !== 'boolean';
    case 'array': return !Array.isArray(value);
    case 'object': return !isPlainObject(value);
    // 모르는 타입은 판단하지 않는다
    default: return false;
  }
}

function checkField(key: string, field: Field, value: unknown): Violation | null {
  const 이름 = label(key, field);

  if (Array.isArray(field.enum) && !field.enum.includes(value)) {
    return { path: key, message: `${이름}은 ${field.enum.join(' · ')} 중 하나여야 한다` };
  }

  if (field.type !== undefined && typeMismatch(value, field.type)) {
    const 기대 = TYPE_NAME[field.type] ?? field.type;
    return { path: key, message: `${이름}은 ${기대}여야 한다` };
  }

  if (typeof value === 'string') {
    if (field.minLength !== undefined && value.length < field.minLength) {
      return field.minLength === 1
        ? { path: key, message: `${이름}은 비워 둘 수 없다` }
        : { path: key, message: `${이름}은 ${field.minLength}글자 이상이어야 한다` };
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return { path: key, message: `${이름}은 ${field.maxLength}글자를 넘을 수 없다` };
    }
  }

  if (typeof value === 'number') {
    if (field.minimum !== undefined && value < field.minimum) {
      return { path: key, message: `${이름}은 ${field.minimum} 이상이어야 한다` };
    }
    if (field.maximum !== undefined && value > field.maximum) {
      return { path: key, message: `${이름}은 ${field.maximum} 이하여야 한다` };
    }
  }

  return null;
}

export function validate(schema: JsonSchema, value: unknown): Violation[] {
  if (!isPlainObject(value)) {
    return [{ path: '', message: '입력값은 칸 이름과 값의 묶음이어야 한다' }];
  }

  const properties = isPlainObject(schema.properties) ? schema.properties : {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const violations: Violation[] = [];

  for (const key of required) {
    if (typeof key === 'string' && value[key] === undefined) {
      const field = (properties[key] ?? {}) as Field;
      violations.push({ path: key, message: `${label(key, field)}은 반드시 채워야 한다` });
    }
  }

  for (const [key, raw] of Object.entries(value)) {
    const field = properties[key];
    // 선언에 없는 칸은 오타이거나 옛 이름이다. 조용히 버리면 값을 넣었다고 믿은 채로 실행된다
    if (field === undefined) {
      violations.push({ path: key, message: `${key}은 이 케이스에 선언되지 않은 칸이다` });
      continue;
    }
    if (raw === undefined) continue;

    const found = checkField(key, field as Field, raw);
    if (found !== null) violations.push(found);
  }

  return violations;
}
