// 설정 API 의 API 애플리케이션 칸 검사 — 종류 · 문서 경로 · 기준 서버 · 대상 서버 줄의 API 인증 (도메인/인증 §7 · 도메인/API §3.8)
// routes.ts 가 300줄을 넘어 따로 둔다. 비밀값 이어받기(API_AUTH_SECRET_REQUIRED)는 옛 값을 읽어야 해서 저장(envs.ts)이 본다

import { z } from 'zod';

import { db } from './store.js';

// 칸 하나하나의 규칙은 아래 API인증틀림 이 본다 — 어기면 INVALID_REQUEST 가 아니라 BAD_API_AUTH 다
export const API인증줄 = z.object({
  name: z.string(),
  tokenUrl: z.string(),
  clientId: z.string(),
  clientSecret: z.string().optional(),
});

/** 보낸 칸. 종류(kind)는 만들기 스키마에만 있다 — 고치기는 KIND_IMMUTABLE 이다 */
export const API칸 = {
  apiDocPath: z.string().nullable().optional(),
  apiDocEnv: z.string().nullable().optional(),
};

type 인증줄 = z.infer<typeof API인증줄>;

// 끝 4자리를 보여도 나머지가 8자 넘게 남아야 한다 — 그래서 12자부터다
function API인증틀림(줄들: 인증줄[]): boolean {
  const 이름들 = 줄들.map((a) => a.name.trim());
  return (
    줄들.length > 10 ||
    new Set(이름들).size !== 이름들.length ||
    줄들.some(
      (a, i) =>
        (이름들[i] ?? '').length < 1 ||
        (이름들[i] ?? '').length > 20 ||
        a.tokenUrl.length > 1000 ||
        !(a.tokenUrl.startsWith('/') || /^https?:\/\/\S+$/.test(a.tokenUrl)) ||
        a.clientId.length < 1 ||
        a.clientId.length > 200 ||
        (a.clientSecret !== undefined && (a.clientSecret.length < 12 || a.clientSecret.length > 500)),
    )
  );
}

interface 보낸칸 {
  apiDocPath?: string | null;
  apiDocEnv?: string | null;
  envs?: { env: string; apiAuths?: 인증줄[] }[];
}

export interface 지금칸 {
  /** 만들기는 스키마가, 고치기는 DB CHECK 가 SCREEN · API 로 막는다 */
  kind: string;
  apiDocEnv: string | null;
  envs: string[];
}

/**
 * 저장 전에 본다. 지금 값(고치기면 DB, 만들기면 본문의 kind)과 보낸 것을 합쳐 본다. 틀리면 오류 코드.
 * 차례가 곧 우선순위다 — 화면 애플리케이션이면 나머지 칸 규칙이 뜻이 없다
 */
export function API칸오류(보낸것: 보낸칸, 지금: 지금칸): string | null {
  const 인증들 = (보낸것.envs ?? []).flatMap((e) => e.apiAuths ?? []);
  if (지금.kind === 'SCREEN' && (보낸것.apiDocPath != null || 보낸것.apiDocEnv != null || 인증들.length > 0)) return 'NOT_API_SERVICE';
  if ((보낸것.envs ?? []).some((e) => e.apiAuths !== undefined && API인증틀림(e.apiAuths))) return 'BAD_API_AUTH';
  const 경로 = 보낸것.apiDocPath;
  if (경로 != null && (!경로.startsWith('/') || 경로.length > 500)) return 'BAD_API_DOC_URL';
  // 기준 서버가 가리키는 줄이 없어지면 판을 받을 주소가 없다 — envs 만 고쳐도 본다
  const 기준 = 보낸것.apiDocEnv === undefined ? 지금.apiDocEnv : 보낸것.apiDocEnv;
  const 키들 = 보낸것.envs?.map((e) => e.env) ?? 지금.envs;
  return 기준 !== null && !키들.includes(기준) ? 'BAD_API_DOC_URL' : null;
}

/** 고치기 전의 종류 · 기준 서버 · 대상 서버 키들. 서비스가 없으면 null — 고치기가 404 를 낸다 */
export async function API칸지금(id: number): Promise<지금칸 | null> {
  const r = await (await db()).query<{ kind: string; api_doc_env: string | null; envs: string[] }>(
    `SELECT s.kind, s.api_doc_env, COALESCE(array_agg(e.env) FILTER (WHERE e.env IS NOT NULL), '{}') AS envs
       FROM service s LEFT JOIN service_env e ON e.service_id = s.id
      WHERE s.id = $1
      GROUP BY s.id`,
    [id],
  );
  const 줄 = r.rows[0];
  return 줄 === undefined ? null : { kind: 줄.kind, apiDocEnv: 줄.api_doc_env, envs: 줄.envs };
}
