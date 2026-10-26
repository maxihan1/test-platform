// 「API 문서」 화면과 작성 요청이 서버를 부르는 호출 모음. 응답 모양은 admin 의 apidoc/routes.ts 를 그대로 옮겼다 (도메인/API §7)

import { call } from './api.js';

export interface ApiDocVersionRow {
  version: number;
  source: 'URL' | 'FILE';
  /** URL 이면 받은 대상 서버, FILE 이면 null */
  env: string | null;
  fileName: string | null;
  createdAt: string;
  /** 누른 사람 아이디. 정기 실행이 실행 시작 때 올린 버전은 null */
  createdBy: string | null;
}

export interface ApiDocList {
  docPath: string | null;
  docEnv: string | null;
  /** 새 버전이 먼저 */
  versions: ApiDocVersionRow[];
}

export interface ApiDocChange {
  method: string;
  path: string;
  change: 'NEW' | 'CHANGED' | 'REMOVED';
  breaking: boolean;
  notes: string[];
}

export interface ApiCoverage {
  version: number | null;
  total: number;
  covered: number;
  operations: { method: string; path: string; codes: { status: number; seen: boolean; noShape: boolean; lastRunId: number | null }[] }[];
}

/** OpenAPI 원문에서 화면이 읽는 칸만. 나머지는 모른 척한다 */
export interface OpenApiDoc {
  paths?: Record<string, Record<string, { summary?: string; tags?: string[] } | undefined> | undefined>;
}

const 앞 = (id: number) => `/services/${String(id)}/api-docs`;

export const apiDocApi = {
  list: (id: number) => call<ApiDocList>(앞(id)),
  doc: (id: number, version: number) => call<{ version: number; doc: OpenApiDoc }>(`${앞(id)}/${String(version)}`),
  compare: (id: number, from: number, to: number) =>
    call<{ changes: ApiDocChange[] }>(`${앞(id)}/compare?from=${String(from)}&to=${String(to)}`),
  coverage: (id: number) => call<ApiCoverage>(`/services/${String(id)}/api-coverage`),
  /** 기준 서버 주소 + 문서 경로에서 지금 받는다. created=false 면 마지막 버전과 같아 새 버전을 안 만들었다 */
  fetch: (id: number) => call<{ version: number; created: boolean }>(`${앞(id)}/fetch`, { method: 'POST' }),
  /** 파일 바이트를 그대로 보낸다 — 가이드 · 자료 올리기와 같은 꼴(새 패키지 없이) */
  upload: (id: number, file: File) =>
    call<{ version: number; created: boolean }>(`${앞(id)}?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: file,
    }),
};
