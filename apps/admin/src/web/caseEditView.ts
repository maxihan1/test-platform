// 케이스 고치기 화면이 쓰는 판단 — 어느 칸을 보이나 · 무엇을 바꿨나 · 무엇이 지워지나 (도메인/카탈로그 §8.1 · 도메인/작성 §3.6 「★ 케이스 고치기」)
// 그림은 CaseEdit.tsx(상세) · CaseBulkEdit.tsx(목록). 막는 것은 서버 authoring/edit.ts 다 — 여기는 누르기 전에 까닭을 보이려는 편의다

import type { 기대값 } from '../authoring/edit.js';

import { ApiError, type CaseRow, type JsonSchema } from './api.js';
import { 요청오류문장 } from './errorText.js';
import { t, type 언어 } from './i18n.js';
import { fieldsOf } from './mask.js';
import { type Field, initialText, schemaToFields, toValues } from './schema.js';
import { message } from './ui.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 코드에 `.default(값)` 한 줄로 적을 수 있는 칸인가 — 서버 `authoring/edit.ts` 의 `적을수있는칸인가` 와 같은 규칙이다.
 * 거기가 정본이고 이 자리는 보일 칸을 고를 뿐이다. 둘이 갈라져도 서버가 BAD_EDIT 로 다시 막고,
 * 갈라졌는지는 caseEditView.test.ts 가 서버 검사(`고칠것검사`)와 견줘 본다
 */
function 적을수있나(prop: unknown): boolean {
  if (!isPlainObject(prop)) return false;
  if ('anyOf' in prop || 'oneOf' in prop || 'allOf' in prop) return false;
  if ('enum' in prop) {
    const 목록 = prop.enum;
    return Array.isArray(목록) && 목록.length > 0 && 목록.every((v) => typeof v === 'string') && (prop.type === undefined || prop.type === 'string');
  }
  return prop.type === 'string' || prop.type === 'number' || prop.type === 'integer' || prop.type === 'boolean';
}

/**
 * 코드 기본값을 바꿀 수 있는 기대결과 칸. **저장값을 안 넘긴다** — 칸은 코드 기본값으로 열려야 한다.
 * 저장값으로 열면 사람이 손대지 않은 칸까지 「바꿨다」가 되어 저장값이 코드로 들어간다
 */
export function 고칠칸들(schema: JsonSchema): Field[] {
  const properties = isPlainObject(schema.properties) ? schema.properties : {};
  return schemaToFields(schema).filter((f) => !f.secret && 적을수있나(properties[f.key]));
}

/** 시작 글자와 다른 칸만 명세 타입으로 되돌려 싣는다. 되돌려 놓은 칸은 안 싣는다 */
export function 바꾼값(fields: Field[], text: Record<string, string>): Record<string, unknown> {
  const 처음 = initialText(fields);
  return toValues(
    fields.filter((f) => (text[f.key] ?? '') !== (처음[f.key] ?? '')),
    text,
  );
}

/**
 * 바꾼 칸 가운데 저장값이 있는 칸의 이름. 반영이 병합되면 서버가 그 칸의 저장값을 지운다 (실행 §8.2) —
 * 안 지우면 저장값이 코드 기본값보다 앞서서 반영한 값이 실행에 안 쓰인다
 */
export function 저장값지울칸(row: CaseRow, fields: Field[], 바꾼키들: string[]): string[] {
  const 저장 = row.savedInput?.expected ?? {};
  return fields.filter((f) => 바꾼키들.includes(f.key) && Object.hasOwn(저장, f.key)).map((f) => f.label);
}

/** 지금 코드의 기대값을 「라벨 값」으로 이어 쓴다. 비밀값은 `fieldsOf` 가 가린다 — 확정은 이것을 보고 하는 판단이다 */
export function 기대값한줄(schema: JsonSchema, 언어: 언어): string {
  const 칸들 = fieldsOf(undefined, schema, 언어);
  if (칸들.length === 0) return t('기대결과 없음', 언어);
  return 칸들.map((f) => `${f.label} ${f.value}`).join(' · ');
}

/** 보낼 값의 타입. 칸 검사는 지나갔다 — 글자로 남은 값은 검사기가 이미 사유를 냈다 */
export function 기대값들(값: Record<string, unknown>): Record<string, 기대값> {
  return Object.fromEntries(
    Object.entries(값).filter((쌍): 쌍 is [string, 기대값] => ['string', 'number', 'boolean'].includes(typeof 쌍[1])),
  );
}

/** 겹치는 고치기는 그 요청 번호를 #번호로 붙인다. 서버 detail 은 번호 배열이라 글자로 오면 「12,15」다 */
export function 고치기오류문장(err: unknown, 언어: 언어): string {
  if (err instanceof ApiError && err.code === 'EDIT_OPEN') {
    const 번호들 = err.message.split(',').filter((x) => x.trim() !== '');
    return 요청오류문장('EDIT_OPEN', 언어, 번호들.map((x) => `#${x.trim()}`).join(' · '));
  }
  return message(err, 언어);
}
