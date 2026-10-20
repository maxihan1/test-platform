// API 애플리케이션 작성 요청의 판 · 대상 서버 판정과 집기 칸 (도메인/API §3.8 「작성」 · 도메인/작성 §7 「AUTHOR API 문서 판」)

import type { ApiAuth, ApiDocRef } from '@platform/kit';

import { 문서설정읽기 } from '../apidoc/store.js';
import { 대상줄읽기 } from './reverse.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 서비스가 API 종류인가. 서비스가 없으면 false — 문이 이미 서비스를 봤다 */
export async function API서비스인가(서비스: number): Promise<boolean> {
  return (await 문서설정읽기(서비스))?.kind === 'API';
}

/**
 * 작성이 갈 수 있는 API 대상 서버인가 — 그 애플리케이션의 줄이고 「실서비스 서버」가 아니다.
 * 계정은 안 본다 — API 는 로그인 대신 API 인증으로 돈다
 */
export async function API대상줄인가(서비스: number, env: unknown): Promise<boolean> {
  if (typeof env !== 'string' || env === '') return false;
  const 줄 = await 대상줄읽기(서비스, env);
  return 줄 !== null && !줄.isProd;
}

export type API칸 =
  | { api: false }
  | { api: true; env: string; 판id: number; version: number }
  | { error: 'API_DOC_REQUIRED' | 'NOT_API_SERVICE' | 'BAD_API_DOC' | 'BAD_ENV' };

/**
 * 작성 요청 만들기 본문의 `apiDoc · env` 를 판정한다. 화면 애플리케이션이면 `{ api: false }` 이고 역방향 판정으로 넘어간다.
 * API 애플리케이션은 화면이 없어 compare · startUrl 을 안 받고, 작성 중 3회 실행이 돌 env 가 꼭 있다
 */
export async function API칸판정(본문: Record<string, unknown>, 서비스: number): Promise<API칸> {
  if (!(await API서비스인가(서비스))) return 본문.apiDoc === undefined ? { api: false } : { error: 'NOT_API_SERVICE' };
  if (본문.compare !== undefined || 본문.startUrl !== undefined) return { error: 'BAD_ENV' };
  if (본문.apiDoc === undefined || 본문.apiDoc === null) return { error: 'API_DOC_REQUIRED' };
  const 판 = typeof 본문.apiDoc === 'number' && Number.isSafeInteger(본문.apiDoc) && 본문.apiDoc > 0 ? await 판번호(서비스, 본문.apiDoc) : null;
  if (판 === null) return { error: 'BAD_API_DOC' };
  if (!(await API대상줄인가(서비스, 본문.env))) return { error: 'BAD_ENV' };
  return { api: true, env: 본문.env as string, 판id: 판, version: 본문.apiDoc as number };
}

/**
 * 재실행 · 이어서 작성 — API 애플리케이션 작성 원본의 env 를 물려받아 다시 판정한다. 안 물려받으면 집기 응답의 target 이 빈다 (§7 「AUTHOR API 문서 판」).
 * 화면 애플리케이션과 케이스 고치기(EDIT — 자식 없이 고쳐 env 가 없다)는 빈 객체다
 */
export async function 재실행API(서비스: number, 원본: { kind: string; env: string | null }): Promise<{ env?: string } | { error: 'BAD_ENV' }> {
  if (원본.kind !== 'AUTHOR' || !(await API서비스인가(서비스))) return {};
  return (await API대상줄인가(서비스, 원본.env)) ? { env: 원본.env as string } : { error: 'BAD_ENV' };
}

async function 판번호(서비스: number, version: number): Promise<number | null> {
  const r = await (await db()).query<{ id: string }>('SELECT id FROM api_doc_version WHERE service_id = $1 AND version = $2', [서비스, version]);
  return r.rows[0] === undefined ? null : Number(r.rows[0].id);
}

/** 집기 응답의 API 대상 서버 — 인증 비밀값 원문이 든다. 에이전트는 자식 환경에만 넘기고 가린다 */
export interface API대상 {
  env: string;
  baseUrl: string | null;
  apiAuths: ApiAuth[];
  /** 만든 뒤 「실서비스 서버」로 체크됐다 — 인증을 비워 보내고 에이전트가 이 까닭으로 FAILED 를 낸다 */
  isProd?: true;
}

/**
 * 집기 응답의 API 칸 — API 애플리케이션의 작성 · 재실행 행에만 target · apiDoc 을 싣는다. 그 밖은 빈 객체다.
 * 재실행 행은 자료가 없어 원본(`sourceId`)의 API 문서 판 자료를 읽는다. env 는 재실행 행이 물려받아 제 칸에 있다
 */
export async function 집기API칸(
  서비스: number,
  행: { id: number; kind: string; sourceId: number | null; env: string | null },
): Promise<{ target?: API대상; apiDoc?: ApiDocRef }> {
  if ((행.kind !== 'AUTHOR' && 행.kind !== 'RERUN') || !(await API서비스인가(서비스))) return {};
  const 자료행 = 행.kind === 'RERUN' && 행.sourceId !== null ? 행.sourceId : 행.id;
  const r = await (await db()).query<{ version: number; doc: unknown }>(
    `SELECT v.version, v.doc FROM authoring_asset a JOIN api_doc_version v ON v.id = a.api_doc_version_id
      WHERE a.request_id = $1 AND a.kind = 'API_DOC' ORDER BY a.position LIMIT 1`,
    [자료행],
  );
  const 판 = r.rows[0];
  const 줄 = 행.env === null ? null : await 대상줄읽기(서비스, 행.env);
  const target: API대상 | undefined =
    행.env === null
      ? undefined
      : {
          env: 행.env,
          baseUrl: 줄?.baseUrl ?? null,
          apiAuths: 줄 === null || 줄.isProd ? [] : 줄.apiAuths,
          ...(줄?.isProd === true ? { isProd: true as const } : {}),
        };
  return { ...(target === undefined ? {} : { target }), ...(판 === undefined ? {} : { apiDoc: { version: 판.version, doc: 판.doc } }) };
}
