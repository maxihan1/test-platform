// BTS 를 「QA Hub AI」 계정의 대신 PAT 로 부른다 — 이슈 다시 읽기 · 보낼 줄 보내기가 같은 자리를 쓴다 (도메인/BTS §3.12 「열쇠 표」)

import { 대신PAT } from '../auth/delegatedPat.js';

/**
 * 부를 BTS 와 누구로 부를지. 봇은 「QA Hub AI」 Auth 계정 이름(bts_link.bot_username), userId 는 사람의 Auth id(MCP 로 부른 사람) —
 * 둘 다 주소를 확인한 뒤 부를 때마다 대신 PAT 로 바꾼다. pat 은 이미 받은 토큰(자동 설정은 누른 사람의 대신 PAT)
 */
export type BTS자리 = { baseUrl: string } & ({ 봇: string } | { userId: string } | { pat: string });

/**
 * 서버 env BTS_BOT_USERNAMES(쉼표로 여럿)에 든 이름만 「QA Hub AI」 로 쓴다. 설정 칸은 운영 계정이 아무 이름이나 적을 수 있어,
 * 묶지 않으면 남의 이름과 자기 서버 주소를 적어 그 사람 대신 PAT 를 받아 갈 수 있다 (2026-11-04 S25 사용자 「막고 배포」 · 도메인/BTS 「열쇠 표」)
 */
export const 봇이름허용 = (이름: string, env: NodeJS.ProcessEnv = process.env): boolean =>
  (env.BTS_BOT_USERNAMES ?? '').split(',').map((n) => n.trim()).filter((n) => n !== '').includes(이름);

const 출처 = (주소: string): string | null => {
  try {
    return new URL(주소).origin;
  } catch {
    return null;
  }
};

/**
 * 서버 env BTS_URLS(쉼표로 여럿)와 출처가 같은 주소로만 열쇠를 보낸다. 이름을 묶어도 주소 칸을 자기 서버로 바꾸면
 * 「QA Hub AI」 · 누른 사람의 대신 PAT 가 그리로 간다 (2026-11-04 S25 사용자 「막고 배포」 · 도메인/BTS 「열쇠 표」)
 */
export const BTS주소허용 = (baseUrl: string, env: NodeJS.ProcessEnv = process.env): boolean => {
  const 여기 = 출처(baseUrl);
  return 여기 !== null && (env.BTS_URLS ?? '').split(',').some((n) => n.trim() !== '' && 출처(n.trim()) === 여기);
};

/** 이름이 비었거나(S25 전에 이은 연결) 허용 목록 밖이면 던진다 — 부르는 쪽은 닿지 않은 것과 같이 다룬다 */
export async function 봇열쇠(이름: string): Promise<string> {
  if (이름 === '') throw new Error('「QA Hub AI」 계정 이름이 없습니다 — 설정 › Issue Bunker 연결에 적어 주세요');
  if (!봇이름허용(이름)) throw new Error(`「QA Hub AI」 계정 이름 ${이름} 은 서버 BTS_BOT_USERNAMES 에 없습니다`);
  return 대신PAT({ username: 이름 });
}

const 열쇠고르기 = async (자리: BTS자리): Promise<string> => {
  if (!BTS주소허용(자리.baseUrl)) throw new Error(`Issue Bunker 주소 ${출처(자리.baseUrl) ?? '(꼴이 틀림)'} 은 서버 BTS_URLS 에 없습니다`);
  if ('pat' in 자리) return 자리.pat;
  return 'userId' in 자리 ? 대신PAT({ userId: 자리.userId }) : 봇열쇠(자리.봇);
};

export interface BTS응답 {
  status: number;
  json: unknown;
}

export type 부르기함수 = (자리: BTS자리, method: string, 경로: string, 몸?: unknown) => Promise<BTS응답>;

/** 닿지 않거나 대신 PAT 를 못 받으면 던진다 — 보낼 줄이 「다시 보낼 것」으로 친다. BTS 는 PAT 를 `Authorization: Bearer` 로 받는다 */
export const BTS부르기: 부르기함수 = async (자리, method, 경로, 몸) => {
  const 열쇠 = await 열쇠고르기(자리);
  const res = await fetch(`${자리.baseUrl.replace(/\/+$/, '')}${경로}`, {
    method,
    headers: {
      authorization: `Bearer ${열쇠}`,
      accept: 'application/json',
      ...(몸 !== undefined && { 'content-type': 'application/json' }),
    },
    ...(몸 !== undefined && { body: JSON.stringify(몸) }),
    signal: AbortSignal.timeout(10_000),
    redirect: 'manual',
  });
  const 글 = await res.text();
  let json: unknown = null;
  try {
    json = 글 === '' ? null : JSON.parse(글);
  } catch {
    // BTS 가 JSON 이 아닌 오류 화면을 줄 때가 있다 — 상태 코드만으로 판단한다
  }
  return { status: res.status, json };
};

export type 올리기함수 = (자리: BTS자리, issueKey: string, 이름: string, 파일: Buffer) => Promise<number>;

/** 이슈 첨부 한 개를 올리고 상태 코드를 돌려준다 (BTS IssueAttachmentController — multipart 칸 file) */
export const BTS올리기: 올리기함수 = async (자리, issueKey, 이름, 파일) => {
  const 몸 = new FormData();
  몸.append('file', new Blob([new Uint8Array(파일)], { type: 'image/png' }), 이름);
  const 열쇠 = await 열쇠고르기(자리);
  const res = await fetch(`${자리.baseUrl.replace(/\/+$/, '')}/api/v1/issues/${encodeURIComponent(issueKey)}/attachments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${열쇠}`, accept: 'application/json' },
    body: 몸,
    signal: AbortSignal.timeout(30_000),
    redirect: 'manual',
  });
  await res.arrayBuffer();
  return res.status;
};

/** BTS 이슈에서 QA Hub 가 보는 칸만 — 상태 · 해결 상태 이름을 단계에 짝짓는 일은 받는 쪽이 bts_link 짝으로 한다 */
export interface BTS이슈 {
  key: string;
  state: string;
  resolution: string | null;
  assigneeId: string | null;
  type: string;
  summary: string;
  /** 구성 요소 번호 — 수정 AI 가 애플리케이션 · 넘길 사람(구성 요소 리드)을 고를 때 쓴다 */
  componentIds: string[];
}

interface 이슈몸 {
  data?: {
    key?: string;
    currentStateKey?: string;
    resolution?: { name?: string } | null;
    assigneeId?: string | null;
    typeKey?: string;
    summary?: string;
    componentIds?: string[] | null;
  };
}

export class BTS읽기오류 extends Error {}

/** 알림 본문을 믿지 않고 이슈를 BTS 에서 다시 읽는다 (도메인/BTS §7 「BTS 알림 받기」). 200 이 아니면 던진다 */
export async function 이슈읽기(자리: BTS자리, issueKey: string, 부르기: 부르기함수 = BTS부르기): Promise<BTS이슈> {
  const r = await 부르기(자리, 'GET', `/api/v1/issues/${encodeURIComponent(issueKey)}`);
  const d = (r.json as 이슈몸 | null)?.data;
  if (r.status !== 200 || d?.key === undefined || d.currentStateKey === undefined) {
    throw new BTS읽기오류(`Issue Bunker 이슈 ${issueKey} 를 못 읽었다 (${String(r.status)})`);
  }
  return {
    key: d.key,
    state: d.currentStateKey,
    resolution: d.resolution?.name ?? null,
    assigneeId: d.assigneeId ?? null,
    type: d.typeKey ?? '',
    summary: d.summary ?? '',
    componentIds: d.componentIds ?? [],
  };
}
