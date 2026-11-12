// 설정 API 의 종류별 칸 검사 — API 애플리케이션의 문서 경로 · 기준 서버 · API 인증, 게임 · API 의 어드민 키 (도메인/인증 §7 · 도메인/API §3.8 · 도메인/게임 §3.10)
// routes.ts 가 300줄을 넘어 따로 둔다. 비밀값 이어받기(API_AUTH_SECRET_REQUIRED · ADMIN_KEY_VALUE_REQUIRED)는 옛 값을 읽어야 해서 저장(envs.ts)이 본다

import { z } from 'zod';

import { 머리이름인가, 어드민키값인가 } from './headerRules.js';
import { 어드민키종류인가 } from './roles.js';
import { db } from './store.js';

// 칸 하나하나의 규칙은 아래 API인증틀림 이 본다 — 어기면 INVALID_REQUEST 가 아니라 BAD_API_AUTH 다
export const API인증줄 = z.object({
  name: z.string(),
  tokenUrl: z.string(),
  clientId: z.string(),
  clientSecret: z.string().optional(),
});

// 규칙은 아래 API칸오류 가 본다 — 어기면 BAD_ADMIN_KEY 다. 값이 없으면 같은 머리의 옛 값을 잇는다(envs.ts)
export const 어드민키줄 = z.object({ header: z.string(), value: z.string().optional() });


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
        // 「//」 로 시작하면 다른 호스트로 풀린다 — 러너 입구도 400 으로 막는다
        !((a.tokenUrl.startsWith('/') && !a.tokenUrl.startsWith('//')) || /^https?:\/\/\S+$/.test(a.tokenUrl)) ||
        a.clientId.length < 1 ||
        a.clientId.length > 200 ||
        (a.clientSecret !== undefined && (a.clientSecret.length < 12 || a.clientSecret.length > 500)),
    )
  );
}

interface 보낸칸 {
  apiDocPath?: string | null;
  apiDocEnv?: string | null;
  envs?: { env: string; apiAuths?: 인증줄[]; adminKey?: z.infer<typeof 어드민키줄> | null }[];
}

export interface 지금칸 {
  /** 만들기는 스키마가, 고치기는 DB CHECK 가 SCREEN · APP · GAME · API 로 막는다 */
  kind: string;
  apiDocEnv: string | null;
  envs: string[];
}

/**
 * 저장 전에 본다. 지금 값(고치기면 DB, 만들기면 본문의 kind)과 보낸 것을 합쳐 본다. 틀리면 오류 코드.
 * 차례가 곧 우선순위다 — API 가 아닌 애플리케이션(웹 · Android 앱)이면 나머지 칸 규칙이 뜻이 없다
 */
export function API칸오류(보낸것: 보낸칸, 지금: 지금칸): string | null {
  // 어드민 키는 서버 어드민 API 를 두드리는 비밀값이다 — 게임 · API 가 아닌 애플리케이션에 들어가면 쓰는 곳 없이 원문만 쌓인다.
  // 코드 이름은 게임만 받던 때 것이다 — 화면 · 검사가 이 이름을 본다
  const 어드민키들 = (보낸것.envs ?? []).flatMap((e) => (e.adminKey == null ? [] : [e.adminKey]));
  if (어드민키들.length > 0 && !어드민키종류인가(지금.kind)) return 'NOT_GAME_SERVICE';
  // 머리 이름은 HTTP 토큰 글자만. 값은 머리에 실을 수 있는 글자(줄바꿈 · 한글 없음)이고 API 인증 비밀값과 같이 끝 4자리를 보여도 8자 넘게 남게 12자부터다.
  // 띄어쓰기는 가운데 한 칸만 받는다 — `Authorization: Bearer <토큰>` 꼴의 서버(Mastodon 등) 때문이다. 앞뒤 · 두 군데는 붙여 넣기 실수라 막는다.
  // 칸 뒤 토큰도 12자부터다 — `Bearer ` 가 12자를 채우면 끝 4자리가 토큰을 거의 다 보인다 (2026-11-10)
  if (어드민키들.some((k) => !머리이름인가(k.header.trim()) || (k.value !== undefined && !어드민키값인가(k.value)))) {
    return 'BAD_ADMIN_KEY';
  }
  const 인증들 = (보낸것.envs ?? []).flatMap((e) => e.apiAuths ?? []);
  if (지금.kind !== 'API' && (보낸것.apiDocPath != null || 보낸것.apiDocEnv != null || 인증들.length > 0)) return 'NOT_API_SERVICE';
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
