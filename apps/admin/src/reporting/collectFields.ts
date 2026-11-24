// 증적 칸 값 만들기 — 입력 · 기대 칸의 라벨과 비밀값 가리기, 절차 · 확인 줄, 폰 한 줄 (SPEC §3.3 · §4.1)
// collect.ts 가 300줄을 넘어 뗐다. 라벨 · 마스킹을 렌더러가 아니라 모델을 만들 때 끝낸다

import type { DeviceInfo, ItemStatus, ShapeCheck } from '@platform/kit';

import { 가린다 } from '../execution/trial.js';
import { api칸 } from './apiTrace.js';
import type { EvidenceAssertion, EvidenceField, EvidenceStep } from './collect.js';

interface RawAssertion {
  statement: string;
  status: ItemStatus;
  actual: unknown;
  expected: unknown;
  blocker?: boolean;
}

export interface RawStep {
  history_id: string;
  seq: number;
  title: string;
  status: ItemStatus;
  duration_ms: number | null;
  assertions: RawAssertion[];
  screenshot_path: string | null;
  error: unknown;
  http_trace: { request: unknown; response: unknown } | null;
  shape_checks: ShapeCheck[] | null;
}

/**
 * 폰 · 앱 판 한 줄. 못 읽은 칸은 그렇다고 적는다 — 빈칸이면 「없는 판」으로 읽힌다 (도메인/리포팅 §8.4 · APP-F1-05).
 * 실제 폰 Chrome 에서 돈 모바일 항목은 앱 판 자리에 Chrome 판이다 — 그 항목만 browser 칸이 있다 (TMO-F4-03)
 */
export function 기기글(d: DeviceInfo): string {
  const 끝 = d.browser === undefined ? `앱 ${d.appVersion ?? '버전 모름'}` : `Chrome ${d.browser ?? '버전 모름'}`;
  return `${d.model ?? '모델 모름'} · Android ${d.osVersion ?? '버전 모름'} · ${끝}`;
}
/** 비밀값은 화면과 문서에서만 가린다. DB 에는 평문 그대로다 (SPEC §4.1) */
const 가림 = '********';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// SPEC §4.1 K9 가 이 이름들에 .meta({ secret: true }) 를 강제한다.
// 정본은 catalog/rules.ts 의 SECRET_NAMES 다 — 컨텍스트가 달라 import 하지 않고 같은 목록을 둔다.
// 새 케이스는 K9 이 표시를 강제하므로 이 목록은 박제 이전 행을 위한 2차 방어다 —
// 20260917000001 이 param_schema 를 '{}' 로 메운 과거 행에는 표시가 아예 없다
const SECRET_NAMES = ['password', 'passwd', 'pw', 'token', 'secret', 'apikey', 'credential'];

// 표시가 없으면 이름으로 판단한다. 모를 때 보여주는 쪽으로 실패하면 비밀번호가 검수처로 나간다
function 가려야하나(key: string, prop: Record<string, unknown>): boolean {
  if (prop.secret === true) return true;
  const lower = key.toLowerCase();
  return SECRET_NAMES.some((word) => lower.includes(word));
}

// 객체 · 배열은 화면(web/mask.ts 보일값)처럼 JSON 한 줄이다. String() 은 [object Object] · 쉼표 이음으로 뭉갠다.
// 안쪽 비밀값 이름 칸도 가린다 — 키 가리기(가려야하나)는 맨 위 칸만 보고, 전에는 [object Object] 가 우연히 감췄다
export const 값글자 = (value: unknown): string =>
  typeof value === 'object' && value !== null
    ? JSON.stringify(value, (k, v: unknown) => (k !== '' && 가려야하나(k, {}) ? 가림 : v))
    : String(value);

// 라벨·마스킹을 여기서 끝낸다. 렌더러가 원본 JSON 에 닿으면 형식이 늘 때마다 마스킹이 새는 자리가 는다
export function toFields(json: unknown, schema: unknown): EvidenceField[] {
  const values = isPlainObject(json) ? json : {};
  const properties =
    isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};

  // 요청이 비운 칸은 비운 채 박제되고 케이스는 코드 기본값으로 돈다. 그 값은 박제 스키마의 default 에만 남는다.
  // 스키마 칸 순서로 걷는다 — 값만 따라가면 같은 케이스도 어느 칸을 고쳤느냐에 따라 순서가 바뀐다 (리포팅 §3.3)
  const 칸: [string, unknown][] = [];
  for (const [key, raw] of Object.entries(properties)) {
    if (Object.hasOwn(values, key)) 칸.push([key, values[key]]);
    else if (isPlainObject(raw) && Object.hasOwn(raw, 'default')) 칸.push([key, raw.default]);
  }
  for (const [key, value] of Object.entries(values)) {
    if (!Object.hasOwn(properties, key)) 칸.push([key, value]);
  }

  return 칸.map(([key, value]) => {
    const raw = properties[key];
    const prop: Record<string, unknown> = isPlainObject(raw) ? raw : {};
    const description = prop.description;

    return {
      // 화면(web/schema.ts)과 같은 규약이다. 갈라지면 폼은 '아이디'인데 증적은 'username' 으로 찍힌다
      label: typeof description === 'string' && description !== '' ? description : key,
      value: 가려야하나(key, prop) ? 가림 : 값글자(value),
    };
  });
}

function toAssertion(a: RawAssertion): EvidenceAssertion {
  return {
    statement: a.statement,
    expected: 값글자(a.expected),
    actual: 값글자(a.actual),
    status: a.status,
    blocker: a.blocker === true,
  };
}

export function toStep(row: RawStep, 비밀: string[], api: boolean): EvidenceStep {
  return {
    seq: row.seq,
    title: row.title,
    status: row.status,
    durationMs: row.duration_ms,
    assertions: 가린다(row.assertions.map(toAssertion), 비밀) as EvidenceAssertion[],
    screenshotPath: row.screenshot_path,
    ...api칸(row, 비밀, api),
  };
}
