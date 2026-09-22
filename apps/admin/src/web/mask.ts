// 입력값·기대결과를 화면에 그릴 칸으로 바꾸면서 비밀값을 가린다 (SPEC §4.1 · §8.2 · §8.3)
// 라벨은 항목에 박제된 스키마에서 읽는다 — 카탈로그는 스캔 때마다 덮어쓰는 캐시라
// 거기서 읽으면 케이스 코드의 .describe() 를 고친 날 과거 증적의 라벨이 같이 바뀐다 (SPEC §3.3)

import { t, type 언어 } from './i18n.js';

/** 화면과 문서에서만 가린다. DB 에는 평문 그대로다 — 같은 값으로 다시 실행할 수 있어야 한다 (SPEC §8.2) */
const 가림 = '********';

// SPEC §4.1 K9 가 이 이름들에 .meta({ secret: true }) 를 강제한다.
// 정본은 catalog/rules.ts 의 SECRET_NAMES 다. 그 파일이 typescript 를 통째로 import 해서
// 화면 번들에 넣을 수 없어 import 하지 않고 같은 목록을 둔다 —
// reporting/collect.ts 가 같은 이유로 같은 모양이고, 셋이 갈라지지 않는지는 check:secret-names 가 본다.
// 새 케이스는 K9 이 표시를 강제하므로 이 목록은 박제 이전 행을 위한 2차 방어다 —
// 20260917000001 이 param_schema 를 '{}' 로 메운 과거 행에는 표시가 아예 없다
const SECRET_NAMES = ['password', 'passwd', 'pw', 'token', 'secret', 'apikey', 'credential'];

export interface Field {
  key: string;
  label: string;
  value: string;
  secret: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 표시가 없으면 이름으로 판단한다.
 *
 * 가려서 손해는 「칸 하나가 안 보인다」이고 안 가려서 손해는 「비밀번호가 검수처로 나간다」다.
 * 모를 때 어느 쪽으로 실패할지를 정한 자리다 (LEARNINGS 2026-09-19).
 */
export function 가려야하나(key: string, prop: Record<string, unknown>): boolean {
  if (prop.secret === true) return true;
  const lower = key.toLowerCase();
  return SECRET_NAMES.some((word) => lower.includes(word));
}

function 보일값(value: unknown, 언어: 언어): string {
  if (value === null || value === undefined) return '—';
  // 스키마는 참·거짓만 알려 준다. 화면에는 코드 낱말 대신 사람이 읽는 두 낱말을 쓴다 (DESIGN.md).
  // **표에 키가 있다고 옮겨지는 것이 아니다** — 여기서 `t()` 를 안 태우면 영어 화면에도
  // 한국어가 그대로 나오는데, 그 낱말이 다른 파일의 키로 있어 검사가 통과한다 (2026-09-22 자기검사)
  if (typeof value === 'boolean') return value ? t('예', 언어) : t('아니오', 언어);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** 값과 박제 스키마를 짝지어 화면에 그릴 칸으로 만든다. 마스킹을 여기서 끝낸다 */
export function fieldsOf(values: unknown, schema: unknown, 언어: 언어): Field[] {
  const 값 = isPlainObject(values) ? values : {};
  const properties = isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};

  return Object.entries(값).map(([key, value]) => {
    const raw = properties[key];
    const prop: Record<string, unknown> = isPlainObject(raw) ? raw : {};
    const description = prop.description;
    const 가린다 = 가려야하나(key, prop);

    return {
      key,
      // 증적(reporting/collect.ts)과 같은 규약이다. 갈라지면 폼은 '아이디'인데 증적은 'username' 으로 찍힌다
      label: typeof description === 'string' && description !== '' ? description : key,
      value: 가린다 ? 가림 : 보일값(value, 언어),
      secret: 가린다,
    };
  });
}

/** 목록 한 줄이 넘지 않을 길이. 넘으면 뒤를 자르고 전부는 상세에서 본다 (SPEC §8.3) */
const 한줄길이 = 80;

/**
 * 「어떤 값으로 돌린 결과인가」를 목록 행에 한 줄로 적는다 (SPEC §8.3).
 *
 * 상세로 들어가야만 보이면 「어떤 값에서 깨졌는가」를 줄 사이에서 비교할 수 없다.
 * **JSON 원문을 붙이지 않는다** — 라벨과 값을 붙여 쓴 한 줄은 JSON 원문이 아니다.
 * 비밀값은 `fieldsOf()` 가 이미 가려서 준다.
 *
 * 입력이 없으면 빈 글자다. `입력 없음` 을 모든 행에 적으면 목록이 시끄러워진다.
 */
export function 한줄로(values: unknown, schema: unknown, 언어: 언어): string {
  const 줄 = fieldsOf(values, schema, 언어)
    .map((field) => `${field.label} ${field.value}`)
    .join(' · ');

  if (줄.length <= 한줄길이) return 줄;
  return `${줄.slice(0, 한줄길이 - 1)}…`;
}
