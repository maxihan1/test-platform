// API 애플리케이션 작성 — 집기 응답의 API 칸 떼기 · 판 원문 파일 · 자식 환경 · 프롬프트 절 · 원장의 API 줄 (도메인/API §3.8 「작성」)
// 판정은 순수 함수다. 파일을 읽고 쓰는 것은 `API원장읽기` · `판파일쓰기` 둘뿐이다

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 원장항목 } from './authoring-ledger.js';
import { 새로쓰기 } from './authoring-ledger-io.js';
import type { 집은것 } from './authoring-rules.js';

/** 판 원문을 두는 자료 폴더 안 이름. 자식이 읽고 kit 이 응답 모양을 견준다(PLATFORM_API_DOC_FILE) */
export const 판파일이름 = 'api-doc.json';

export interface API인증 {
  name: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

/** 에이전트가 집기 응답에서 뗀 API 묶음 — 비밀값 원문이 든다. 자식 환경에만 넘기고 가린다 */
export interface API작성 {
  env: string;
  baseUrl: string | null;
  인증들: API인증[];
  판: number;
  문서: unknown;
  /** 만든 뒤 「실서비스 서버」로 체크됐다 — 서버가 인증을 비워 보낸다 */
  isProd?: true;
}

const 객체인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function 인증들읽기(v: unknown): API인증[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((a: unknown) => {
    if (!객체인가(a)) return [];
    const { name, tokenUrl, clientId, clientSecret } = a;
    return typeof name === 'string' && typeof tokenUrl === 'string' && typeof clientId === 'string' && typeof clientSecret === 'string'
      ? [{ name, tokenUrl, clientId, clientSecret }]
      : [];
  });
}

/**
 * 집기 응답에서 API 칸을 뗀다. **API 행이면 `target` 을 지운 것을 준다** — 에이전트는 `target` 이 있으면 역방향(화면 대조)으로 돈다.
 * 판(`apiDoc`)이 없는 행은 그대로다. 판은 있는데 대상 서버가 없으면 `api.env` 가 빈 글자라 `API점검` 이 막는다
 */
export function API떼기(것: 집은것): 집은것 {
  const 판: unknown = (것 as { apiDoc?: unknown }).apiDoc;
  const t: Record<string, unknown> = 객체인가(것.target) ? (것.target as unknown as Record<string, unknown>) : {};
  // 판 자료가 지워져 apiDoc 만 빠져도 target 의 apiAuths 로 API 행임을 안다 — 역방향으로 돌거나 비밀값을 안 가리면 안 된다
  if (!객체인가(판) && !Array.isArray(t.apiAuths)) return 것;
  const { target: _뗌, ...나머지 } = 것;
  return {
    ...나머지,
    api: {
      env: typeof t.env === 'string' ? t.env : '',
      baseUrl: typeof t.baseUrl === 'string' ? t.baseUrl : null,
      인증들: 인증들읽기(t.apiAuths),
      판: 객체인가(판) && typeof 판.version === 'number' ? 판.version : 0,
      문서: 객체인가(판) ? 판.doc : undefined,
      ...(t.isProd === true ? { isProd: true as const } : {}),
    },
  };
}

/** 자식을 띄우기 전에 막을 까닭. 없으면 null */
export function API점검(api: API작성): string | null {
  if (api.isProd === true) return `대상 서버 「${api.env}」 가 「실서비스 서버」로 체크돼 작성이 가지 않는다 — 다른 대상 서버로 새 요청을 넣어라`;
  if (api.env === '' || api.baseUrl === null || !/^https?:\/\//.test(api.baseUrl)) {
    return `대상 서버 「${api.env}」 줄이 없어졌거나 주소가 http·https 가 아니다 — 설정을 확인하고 새 요청으로 넣어라`;
  }
  if (!Number.isSafeInteger(api.판) || api.판 < 1 || !객체인가(api.문서)) return 'API 문서 판 원문이 오지 않았다 — 판이 지워졌으면 새 요청으로 넣어라';
  return null;
}

/** 판 원문을 자료 폴더에 쓴다. 비밀값이 없는 문서라 가리지 않는다. 못 쓰면 false */
export function 판파일쓰기(api: API작성, 자료폴더: string): boolean {
  return 새로쓰기(join(자료폴더, 판파일이름), JSON.stringify(api.문서));
}

/**
 * 자식 환경 — 작성 중 돌려 보기가 정식 실행과 같은 길(러너가 넘기는 이름)로 돈다. **값을 프롬프트 · 인자에 싣지 않는다**
 * (역방향 `대상환경` 과 같은 규칙). 판 파일을 주면 kit 이 응답 모양도 견준다 — 실행 때 깨질 케이스를 작성 중에 본다
 */
export function API환경(api: API작성, 자료폴더: string): Record<string, string> {
  return {
    PLATFORM_BASE_URL: api.baseUrl ?? '',
    PLATFORM_API_AUTHS: JSON.stringify(api.인증들),
    PLATFORM_API_DOC_FILE: join(자료폴더, 판파일이름),
  };
}

/** 줄 프롬프트의 API 절. 인증 이름만 싣고 비밀값은 환경 변수에만 둔다. 절차의 정본은 `tpx-cases` `references/api.md` 다 */
export function API절(api: API작성, 자료폴더: string): string[] {
  const 이름들 = api.인증들.map((a) => `「${a.name}」`).join(' · ');
  return [
    '',
    '--- API 문서 ---',
    '이 애플리케이션은 종류 「API」다 — 화면이 없다. `.claude/skills/tpx-cases/references/api.md` 를 먼저 읽고 따라라. 화면 훑기 · 요소 찾기 · 화면 지도는 건너뛴다.',
    `- API 문서 판 ${String(api.판)}: ${join(자료폴더, 판파일이름)} — OpenAPI 원문이다. 응답 코드 · 모양 · 경계 숫자의 근거다. 케이스 머리에 \`apiDoc: ${String(api.판)}\` 을 단다`,
    `- 돌려 볼 대상 서버: ${api.env} — ${api.baseUrl ?? ''}. 환경 변수 PLATFORM_BASE_URL · PLATFORM_API_AUTHS · PLATFORM_API_DOC_FILE 이 이미 있다 — 돌려 보기 명령을 그대로 부르면 그 서버로 돈다`,
    이름들 === ''
      ? '- 이 대상 서버에 API 인증이 없다. 토큰이 필요한 API 는 「인증 없이」 401 케이스만 쓰고, 나머지는 결과 요약에 「API 인증 없음」으로 적어라'
      : `- API 인증 이름: ${이름들} — 케이스는 \`api('<이름>')\` 로만 부른다. 값은 환경 변수에만 있다. 출력 · 인자 · 파일에 쓰지 마라`,
    '- 요구 목록 사본에 `API <메서드> <경로> <코드>` 줄이 있다 — 표준 기획서 번호와 같이 케이스 줄의 출처나 「제외」로 덮는다',
  ];
}

const 메서드들 = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'];

/**
 * 판의 API × 숫자 응답 코드마다 원장 한 줄 — 번호 꼴 `API POST /v1/pushes 201` (도메인/API §3.8 「작성」 「원장」).
 * `4XX` · `default` 는 안 든다 — 어느 코드를 받아야 덮었는지 정해지지 않는다(커버리지 분모와 같다). 경로는 문서 차례, 코드는 작은 것부터
 */
export function API원장항목(문서: unknown): 원장항목[] {
  const 경로들 = 객체인가(문서) && 객체인가(문서.paths) ? 문서.paths : {};
  return Object.entries(경로들).flatMap(([경로, 줄]) =>
    // 빈칸 · 표 칸 · 백틱이 든 경로는 표 출처 칸에서 한 번호로 못 읽는다 — 덮을 수 없는 줄을 만들지 않는다
    !객체인가(줄) || /[\s|`]/.test(경로)
      ? []
      : 메서드들.flatMap((m) => {
          const 작업 = 줄[m];
          if (!객체인가(작업) || !객체인가(작업.responses)) return [];
          return Object.keys(작업.responses)
            .filter((c) => /^[1-5]\d\d$/.test(c))
            .sort()
            .map((c) => {
              const 요약 = typeof 작업.summary === 'string' ? ` — ${작업.summary.slice(0, 60)}` : '';
              return { 번호: `API ${m.toUpperCase()} ${경로} ${c}`, 자료: 'API 문서', 문장: `${m.toUpperCase()} ${경로} 가 ${c} 로 응답한다${요약}` };
            });
        }),
  );
}

/**
 * 자식의 `npm run prd:ledger` 가 원장을 다시 만들 때 — 자료 폴더에 판 파일이 있으면 그 API 줄, 없으면 빈 목록(화면 애플리케이션).
 * 에이전트는 파일을 다시 읽지 않고 메모리의 판으로 만든다 — 자식이 고친 파일로 판정이 흔들리지 않게
 */
export function API원장읽기(자료폴더: string): 원장항목[] {
  const 자리 = join(자료폴더, 판파일이름);
  if (!existsSync(자리)) return [];
  try {
    return API원장항목(JSON.parse(readFileSync(자리, 'utf8')));
  } catch (e) {
    throw new Error(`API 문서 판 파일이 JSON 이 아니다 — ${자리}`, { cause: e });
  }
}
