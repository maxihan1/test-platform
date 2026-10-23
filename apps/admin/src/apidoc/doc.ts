// API 문서(OpenAPI 3.x JSON) 읽기 · 지문 · 받기 · 판 비교 · 커버리지 틀 — DB 를 모른다 (도메인/API §3.8 「API 문서와 판」 · §7)

import { createHash } from 'node:crypto';

import { jsonb에맞춘다 } from '../jsonbText.js';

export const 문서상한 = 5 * 1024 * 1024;

type 객체 = Record<string, unknown>;
const 객체인가 = (v: unknown): v is 객체 => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 받은 글자를 OpenAPI 3.x JSON 으로 읽는다. 아니면 BAD_API_DOC 의 까닭 한 줄 */
export function 문서읽기(글: string): { 문서: 객체 } | { reason: string } {
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return { reason: 'JSON 이 아닙니다 — YAML 은 받지 않습니다' };
  }
  if (!객체인가(값)) return { reason: 'JSON 객체가 아닙니다' };
  // Postgres JSONB 가 못 담는 글자는 바꿔서 받는다. 안 바꾸면 저장에서 터져 500 이 된다
  if (typeof 값.openapi === 'string' && 값.openapi.startsWith('3.')) return { 문서: jsonb에맞춘다(값) };
  return {
    reason: 'swagger' in 값 ? 'Swagger 2.0 문서입니다 — OpenAPI 3 으로 변환해서 올려 주세요' : '최상위 openapi 가 3. 으로 시작하지 않습니다',
  };
}

function 키정렬(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(키정렬);
  if (!객체인가(v)) return v;
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, 키정렬(v[k])]));
}

/** 키를 정렬하고 공백을 뺀 JSON 의 SHA-256. 들여쓰기 · 키 차례만 다른 문서는 같은 판이다 */
export const 지문 = (v: unknown): string => createHash('sha256').update(JSON.stringify(키정렬(v))).digest('hex');

/** 주소에서 문서 글자를 받는다. 못 받으면 502 API_DOC_FETCH_FAILED 의 까닭 한 줄 */
export async function 문서받기(주소: string): Promise<{ 글: string } | { reason: string }> {
  try {
    const res = await fetch(주소, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { reason: `응답 코드 ${res.status}` };
    // ponytail: 길이 머리가 없는 응답은 다 받은 뒤에 잰다. 그런 큰 문서 서버가 나오면 스트림으로 세다 끊는다
    if (Number(res.headers.get('content-length') ?? 0) > 문서상한) return { reason: '5MB 를 넘습니다' };
    const 글 = await res.text();
    return Buffer.byteLength(글) > 문서상한 ? { reason: '5MB 를 넘습니다' } : { 글 };
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') return { reason: '10초 안에 받지 못했습니다' };
    const 코드 = err instanceof Error && 객체인가(err.cause) ? err.cause.code : undefined;
    return { reason: `연결하지 못했습니다 — ${typeof 코드 === 'string' ? 코드 : String(err)}` };
  }
}

/**
 * 문서 안의 `$ref`(#/…)를 푼다. 돌고 도는 참조는 그 자리에 `$ref` 를 남긴다.
 * 여러 곳이 같은 스키마를 겹겹이 가리키면 푼 크기가 거듭제곱으로 불어서 예산을 둔다 — 다 쓰면 남은 참조는 `$ref` 그대로다.
 * ponytail: 예산을 넘긴 깊은 곳의 바뀜은 판 비교가 못 본다. 그런 문서가 나오면 참조 이름 단위로 견준다
 */
function 풀기(문서: 객체, v: unknown, 예산: { 남음: number }, 본것: ReadonlySet<string> = new Set()): unknown {
  if (Array.isArray(v)) return v.map((x) => 풀기(문서, x, 예산, 본것));
  if (!객체인가(v)) return v;
  const ref = v.$ref;
  if (typeof ref === 'string' && ref.startsWith('#/')) {
    if (본것.has(ref) || 예산.남음-- <= 0) return { $ref: ref };
    const 간곳 = ref
      .slice(2)
      .split('/')
      .reduce<unknown>((at, k) => (객체인가(at) ? at[k.replaceAll('~1', '/').replaceAll('~0', '~')] : undefined), 문서);
    return 풀기(문서, 간곳, 예산, new Set([...본것, ref]));
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, 풀기(문서, x, 예산, 본것)]));
}

const 메서드들 = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

interface 작업 {
  method: string;
  path: string;
  parameters: 객체[];
  body: unknown;
  responses: 객체;
}

/** 문서의 API(메서드 · 경로)마다 요청 칸과 응답을 풀어 둔다. 경로에 붙은 parameters 도 합친다 */
function 작업들(문서: 객체): Map<string, 작업> {
  const 결과 = new Map<string, 작업>();
  const paths = 객체인가(문서.paths) ? 문서.paths : {};
  const 예산 = { 남음: 20_000 };
  for (const [path, 원래] of Object.entries(paths)) {
    const 줄 = 풀기(문서, 원래, 예산);
    if (!객체인가(줄)) continue;
    const 공통 = Array.isArray(줄.parameters) ? 줄.parameters.filter(객체인가) : [];
    for (const m of 메서드들) {
      const op = 줄[m];
      if (!객체인가(op)) continue;
      const 자기 = Array.isArray(op.parameters) ? op.parameters.filter(객체인가) : [];
      const body = 객체인가(op.requestBody) && 객체인가(op.requestBody.content) ? op.requestBody.content['application/json'] : undefined;
      결과.set(`${m.toUpperCase()} ${path}`, {
        method: m.toUpperCase(),
        path,
        parameters: [...공통.filter((p) => !자기.some((q) => q.name === p.name && q.in === p.in)), ...자기],
        body: 객체인가(body) ? body.schema : undefined,
        responses: 객체인가(op.responses) ? op.responses : {},
      });
    }
  }
  return 결과;
}

const 모양 = (응답: unknown): unknown => {
  const content = 객체인가(응답) && 객체인가(응답.content) ? 응답.content['application/json'] : undefined;
  return 객체인가(content) ? content.schema : undefined;
};

/** 커버리지 분모 — 마지막 판의 API 마다 숫자로 적힌 응답 코드. `4XX` · `default` 는 덮었는지 정할 수 없어 뺀다 */
export function 커버리지틀(문서: 객체): { method: string; path: string; codes: { status: number; noShape: boolean }[] }[] {
  return [...작업들(문서).values()].map((op) => ({
    method: op.method,
    path: op.path,
    codes: Object.keys(op.responses)
      .filter((c) => /^[1-5]\d\d$/.test(c))
      .map((c) => ({ status: Number(c), noShape: 모양(op.responses[c]) === undefined })),
  }));
}

interface 칸 {
  형: string;
  필수: boolean;
}

/** 스키마의 칸을 점 경로로 편다(`items.status` · `tags[]`). 필수는 부모부터 내내 필수일 때만 */
function 칸들(s: unknown, 앞 = '', 필수 = true, 결과 = new Map<string, 칸>(), 깊이 = 0): Map<string, 칸> {
  if (!객체인가(s) || 깊이 > 10) return 결과;
  if (Array.isArray(s.allOf)) for (const sub of s.allOf) 칸들(sub, 앞, 필수, 결과, 깊이 + 1);
  const required = Array.isArray(s.required) ? s.required : [];
  if (객체인가(s.properties)) {
    for (const [k, sub] of Object.entries(s.properties)) {
      const 이름 = 앞 === '' ? k : `${앞}.${k}`;
      const 이것필수 = 필수 && required.includes(k);
      결과.set(이름, { 형: 형이름(sub), 필수: 이것필수 });
      칸들(sub, 이름, 이것필수, 결과, 깊이 + 1);
    }
  }
  if (s.items !== undefined) 칸들(s.items, `${앞}[]`, 필수, 결과, 깊이 + 1);
  return 결과;
}

function 형이름(s: unknown): string {
  if (!객체인가(s)) return '?';
  if (typeof s.type === 'string') return s.type;
  return Array.isArray(s.type) ? s.type.join('|') : '?';
}

/** 요청 칸 — 경로 · 질의 · 머리 파라미터와 본문 칸을 한 지도로 */
function 요청칸들(op: 작업): Map<string, 칸> {
  const 결과 = 칸들(op.body);
  for (const p of op.parameters) {
    if (typeof p.name !== 'string') continue;
    결과.set(`${String(p.in)}:${p.name}`, { 형: 형이름(p.schema), 필수: p.required === true });
  }
  return 결과;
}

export interface 판변화 {
  method: string;
  path: string;
  change: 'NEW' | 'CHANGED' | 'REMOVED';
  breaking: boolean;
  notes: string[];
}

/**
 * 두 판의 같은 API 를 견줘 사람 말 한 줄씩과 깨는 변경인지 낸다 (도메인/API §3.8 「바뀐 API 만 다시 작성」).
 * 문구는 화면 「API 문서」에 그대로 뜬다 — 저장소 말(칸 · 형) 대신 화면 말(필드 · 타입 · 추가 · 삭제)로 적는다 (2026-10-21 사용자)
 */
function 견주기(전: 작업, 후: 작업): { notes: string[]; breaking: boolean } {
  const notes: string[] = [];
  let breaking = false;
  const 깸 = (글: string) => {
    notes.push(글);
    breaking = true;
  };

  const 전요청 = 요청칸들(전);
  for (const [이름, 칸] of 요청칸들(후)) {
    const 옛 = 전요청.get(이름);
    if (옛 !== undefined && 옛.형 !== 칸.형) 깸(`요청 필드 ${이름} 타입 변경 (${옛.형} → ${칸.형})`);
    else if (칸.필수 && 옛?.필수 !== true) 깸(`요청 필수 필드 ${이름} 추가`);
    else if (옛 === undefined) notes.push(`요청 필드 ${이름} 추가`);
  }
  const 후요청 = 요청칸들(후);
  for (const 이름 of 전요청.keys()) if (!후요청.has(이름)) notes.push(`요청 필드 ${이름} 삭제`);

  for (const 코드 of Object.keys(전.responses)) if (!(코드 in 후.responses)) 깸(`응답 ${코드} 삭제`);
  for (const 코드 of Object.keys(후.responses)) {
    if (!(코드 in 전.responses)) {
      notes.push(`응답 ${코드} 추가`);
      continue;
    }
    const 옛칸 = 칸들(모양(전.responses[코드]));
    const 새칸 = 칸들(모양(후.responses[코드]));
    for (const [이름, 칸] of 옛칸) {
      const 새 = 새칸.get(이름);
      if (새 === undefined) 깸(`응답 ${코드} 필드 ${이름} 삭제`);
      else if (새.형 !== 칸.형) 깸(`응답 ${코드} 필드 ${이름} 타입 변경 (${칸.형} → ${새.형})`);
    }
    for (const 이름 of 새칸.keys()) if (!옛칸.has(이름)) notes.push(`응답 ${코드} 필드 ${이름} 추가`);
  }
  return { notes: notes.length > 0 ? notes : ['설명이나 세부 규칙 변경'], breaking };
}

/** 두 판의 API 마다 새 · 바뀜 · 없어짐. 같은 API 는 싣지 않는다. 메서드 · 경로 차례 */
export function 판비교(전문서: 객체, 후문서: 객체): 판변화[] {
  const 전 = 작업들(전문서);
  const 후 = 작업들(후문서);
  const 결과: 판변화[] = [];
  for (const 키 of [...new Set([...전.keys(), ...후.keys()])].sort()) {
    const a = 전.get(키);
    const b = 후.get(키);
    if (a === undefined && b !== undefined) {
      결과.push({ method: b.method, path: b.path, change: 'NEW', breaking: false, notes: [] });
    } else if (a !== undefined && b === undefined) {
      결과.push({ method: a.method, path: a.path, change: 'REMOVED', breaking: true, notes: ['API 삭제'] });
    } else if (a !== undefined && b !== undefined && 지문(a) !== 지문(b)) {
      결과.push({ method: b.method, path: b.path, change: 'CHANGED', ...견주기(a, b) });
    }
  }
  return 결과;
}
