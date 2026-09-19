// 입력값·기대결과를 화면에 그릴 칸으로 바꾸면서 비밀값을 가린다 (SPEC §4.1 · §8.2 · §8.3)
// 라벨은 항목에 박제된 스키마에서 읽는다 — 카탈로그는 스캔 때마다 덮어쓰는 캐시라
// 거기서 읽으면 케이스 코드의 .describe() 를 고친 날 과거 증적의 라벨이 같이 바뀐다 (SPEC §3.3)

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

function 보일값(value: unknown): string {
  if (value === null || value === undefined) return '—';
  // 스키마는 참·거짓만 알려 준다. 화면에는 코드 낱말 대신 사람이 읽는 두 낱말을 쓴다 (DESIGN.md)
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** 값과 박제 스키마를 짝지어 화면에 그릴 칸으로 만든다. 마스킹을 여기서 끝낸다 */
export function fieldsOf(values: unknown, schema: unknown): Field[] {
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
      value: 가린다 ? 가림 : 보일값(value),
      secret: 가린다,
    };
  });
}
