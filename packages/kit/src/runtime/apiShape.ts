// API 케이스 응답을 케이스가 만들어진 판의 OpenAPI 문서와 견준다 (SPEC 도메인/API §3.8 「응답 모양 확인」)
// 업계 관례대로 본다 — 필수 칸 빠짐 · 형 다름 · enum 밖 · 문서에 없는 코드는 실패, 추가 칸은 문서가 막았을 때만 실패

import { readFileSync } from 'node:fs';

import { z } from 'zod';

import type { ShapeCheck } from '../types.js';

type 객체 = Record<string, unknown>;
const 객체인가 = (v: unknown): v is 객체 => typeof v === 'object' && v !== null && !Array.isArray(v);

const 문제상한 = 5;

/** 러너가 PLATFORM_API_DOC_FILE 로 넘긴 판 원문. 없으면 undefined — 화면 케이스도 같은 길로 온다 */
export function 판읽기(파일: string | undefined): unknown {
  if (파일 === undefined || 파일 === '') return undefined;
  return JSON.parse(readFileSync(파일, 'utf8')) as unknown;
}

// '#/components/schemas/Push' 의 '#/' 뒤
function 따라가기(문서: unknown, 길: string): unknown {
  return 길
    .split('/')
    .reduce<unknown>((at, k) => (객체인가(at) ? at[k.replaceAll('~1', '/').replaceAll('~0', '~')] : undefined), 문서);
}

// 응답 · 경로 줄 자체가 $ref 인 문서가 있다. 돌고 도는 참조에서 멈추게 횟수를 둔다
function 풀린(문서: unknown, v: unknown): unknown {
  let 지금 = v;
  for (let i = 0; i < 10 && 객체인가(지금) && typeof 지금.$ref === 'string' && 지금.$ref.startsWith('#/'); i++) {
    지금 = 따라가기(문서, 지금.$ref.slice(2));
  }
  return 지금;
}

const 틀정규식 = (틀: string): RegExp =>
  new RegExp(`^${틀.split(/\{[^}]+\}/).map((조각) => 조각.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+')}$`);

const 끝빗금뺌 = (길: string): string => (길.length > 1 ? 길.replace(/\/+$/, '') : 길);

/** 메서드 · 주소로 문서의 경로 틀을 찾는다. 글자 마디가 많은 틀이 이긴다(`/v1/pushes/batch` 가 `/v1/pushes/{id}` 보다 먼저) */
function 틀찾기(문서: 객체, method: string, url: string): { path: string; op: 객체 } | undefined {
  const paths = 객체인가(문서.paths) ? 문서.paths : {};
  const 첫서버 = Array.isArray(문서.servers) && 객체인가(문서.servers[0]) ? 문서.servers[0].url : undefined;
  // servers[0].url 에 경로가 있으면(https://api.x.com/v2 · /v2) 틀 앞에 붙는다. 서버 변수({port})는 주소로 못 읽어 0 으로 채워 읽는다
  let 앞 = '';
  try {
    if (typeof 첫서버 === 'string') 앞 = 끝빗금뺌(new URL(첫서버.replace(/\{[^}]*\}/g, '0'), 'http://x').pathname).replace(/^\/$/, '');
  } catch {
    // 못 읽는 서버 주소면 앞을 안 붙인다 — 문서 쪽 한계로 케이스 요청이 터지지 않게
  }
  const 받은 = 끝빗금뺌(new URL(url, 'http://x').pathname);
  let 고른: { path: string; op: 객체; 글자: number } | undefined;
  for (const [틀, 줄] of Object.entries(paths)) {
    const 항목 = 풀린(문서, 줄);
    const op = 객체인가(항목) ? 풀린(문서, 항목[method.toLowerCase()]) : undefined;
    if (!객체인가(op) || !틀정규식(끝빗금뺌(앞 + 틀)).test(받은)) continue;
    const 글자 = 틀.split('/').filter((m) => m !== '' && !m.includes('{')).length;
    if (고른 === undefined || 글자 > 고른.글자) 고른 = { path: 틀, op, 글자 };
  }
  return 고른;
}

// 판은 항목 내내 같다 — 같은 스키마 객체를 응답마다 다시 옮기지 않게 판마다 쥔다
const 옮긴것 = new WeakMap<객체, Map<unknown, z.ZodType>>();

function 검사기(문서: 객체, 스키마: unknown): z.ZodType {
  let 판 = 옮긴것.get(문서);
  if (판 === undefined) 옮긴것.set(문서, (판 = new Map()));
  let 값 = 판.get(스키마);
  if (값 === undefined) 판.set(스키마, (값 = zod스키마(문서, 스키마)));
  return 값;
}

/** OpenAPI 의 '#/components/…' 참조를 zod 가 푸는 '#/$defs/…' 꼴로 바꾼다 — zod 는 $defs · definitions 아래만 찾는다 */
function zod스키마(문서: 객체, 스키마: unknown): z.ZodType {
  const 옛판 = typeof 문서.openapi === 'string' && 문서.openapi.startsWith('3.0');
  const 키 = 옛판 ? 'definitions' : '$defs';
  const 정의: 객체 = {};
  const 바꾸기 = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(바꾸기);
    if (!객체인가(v)) return v;
    const 결과 = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, 바꾸기(x)]));
    if (typeof v.$ref === 'string' && v.$ref.startsWith('#/')) {
      const 길 = v.$ref.slice(2);
      if (!(길 in 정의)) {
        // 자리를 먼저 잡는다 — 자기를 가리키는 스키마에서 돌지 않게
        정의[길] = {};
        정의[길] = 바꾸기(따라가기(문서, 길));
      }
      결과.$ref = `#/${키}/${길.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    }
    return 결과;
  };
  const 뿌리 = 바꾸기(스키마);
  if (!객체인가(뿌리)) return z.fromJSONSchema(뿌리 as boolean);
  // 판 표시는 문서의 openapi 로 정한다. 스키마 안 $schema 가 그것을 덮지 않게 뺀다
  const { $schema: _뺌, ...나머지 } = 뿌리;
  return z.fromJSONSchema({ ...나머지, [키]: 정의 }, { defaultTarget: 옛판 ? 'openapi-3.0' : 'draft-2020-12' });
}

function 형이름(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

const 경로글 = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((글, k) => (typeof k === 'number' ? `${글}[${k}]` : 글 === '' ? String(k) : `${글}.${String(k)}`), '') || '본문';

function 문제글(issue: z.core.$ZodIssue): string {
  const 칸 = 경로글(issue.path);
  const 받은 = 'input' in issue ? issue.input : undefined;
  switch (issue.code) {
    case 'invalid_type':
      return 받은 === undefined ? `필수 칸 ${칸} 가 없다` : `${칸} 은 ${issue.expected} 여야 하는데 ${형이름(받은)} 이다`;
    case 'invalid_value':
      // enum · const 칸이 빠졌을 때도 이 코드다
      if (받은 === undefined) return `필수 칸 ${칸} 가 없다`;
      // enum 밖 값은 짧은 이름이라 보여 준다. 길면 자른다 — 문제 줄은 절차 기록처럼 가린 뒤 저장 · 화면에 간다
      return `${칸} 값 ${JSON.stringify(받은).slice(0, 50)} 은 문서에 없는 값이다`;
    case 'unrecognized_keys':
      return `${칸} 에 문서가 막은 칸 ${issue.keys.join(' · ')} 이 있다`;
    case 'invalid_format':
      return `${칸} 은 ${issue.format} 꼴이어야 한다`;
    case 'too_small':
    case 'too_big':
      // 값은 싣지 않는다 — 길이 규칙에 걸린 글자가 토큰일 수 있다
      return `${칸} 이 문서의 범위를 벗어났다`;
    default:
      return `${칸} 이 문서와 맞지 않는다 — ${issue.message}`;
  }
}

/**
 * 요청 하나의 응답 모양 확인. 문서에 없는 경로(토큰 주소처럼 문서 밖 요청)면 undefined — 견주지 않는다.
 * 본문은 절차 기록용으로 자르기 전의 글이다
 */
export function 모양확인(문서: unknown, method: string, url: string, status: number, 본문: string): ShapeCheck | undefined {
  if (!객체인가(문서)) return undefined;
  const 틀 = 틀찾기(문서, method, url);
  if (틀 === undefined) return undefined;
  const 머리 = { method: method.toUpperCase(), path: 틀.path, status };
  const 실패 = (...problems: string[]): ShapeCheck => ({ ...머리, result: 'FAIL', problems: problems.slice(0, 문제상한) });

  // 같은 코드 → 4XX 같은 범위 → default 차례로 찾는다
  const 응답들 = 풀린(문서, 틀.op.responses);
  const 줄들 = 객체인가(응답들) ? 응답들 : {};
  const 범위 = `${String(status)[0]}XX`;
  const 줄 = 줄들[String(status)] ?? 줄들[범위] ?? 줄들[범위.toLowerCase()] ?? 줄들.default;
  if (줄 === undefined) return 실패(`문서에 없는 응답 코드 ${status}`);

  const 응답 = 풀린(문서, 줄);
  const content = 객체인가(응답) && 객체인가(응답.content) ? 응답.content : {};
  const 형식 = Object.keys(content).find((k) => /^application\/([\w.-]+\+)?json\b/i.test(k));
  const 매체 = 형식 === undefined ? undefined : content[형식];
  const 스키마 = 객체인가(매체) ? 매체.schema : undefined;
  if (스키마 === undefined) return { ...머리, result: 'NO_SHAPE' };

  let 값: unknown;
  try {
    값 = JSON.parse(본문);
  } catch {
    return 실패('JSON 이 아닙니다');
  }
  let 검사: z.ZodType;
  try {
    검사 = 검사기(문서, 스키마);
  } catch (err) {
    // zod 가 못 읽는 스키마(not · if/then 같은 것)다. 문서 쪽 한계라 케이스를 깨지 않고 코드만 본 것으로 둔다
    console.error(`[kit] ${머리.method} ${머리.path} ${status} 응답 모양을 읽지 못해 코드만 본다: ${err instanceof Error ? err.message : String(err)}`);
    return { ...머리, result: 'NO_SHAPE' };
  }
  const 결과 = 검사.safeParse(값, { reportInput: true });
  return 결과.success ? { ...머리, result: 'PASS' } : 실패(...결과.error.issues.map(문제글));
}
