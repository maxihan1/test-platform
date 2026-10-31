// BTS 를 「QA Hub AI」 열쇠로 부른다 — 이슈 다시 읽기 · 보낼 줄 보내기가 같은 자리를 쓴다 (도메인/BTS §3.12 「열쇠 표」)

/** 부를 BTS 와 열쇠. bts_link 한 줄에서 온다 */
export interface BTS자리 {
  baseUrl: string;
  botKey: string;
}

export interface BTS응답 {
  status: number;
  json: unknown;
}

export type 부르기함수 = (자리: BTS자리, method: string, 경로: string, 몸?: unknown) => Promise<BTS응답>;

/** 닿지 않으면 던진다 — 보낼 줄이 「다시 보낼 것」으로 친다. BTS 는 PAT 를 `Authorization: Bearer` 로 받는다 */
export const BTS부르기: 부르기함수 = async (자리, method, 경로, 몸) => {
  const res = await fetch(`${자리.baseUrl.replace(/\/+$/, '')}${경로}`, {
    method,
    headers: {
      authorization: `Bearer ${자리.botKey}`,
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
  const res = await fetch(`${자리.baseUrl.replace(/\/+$/, '')}/api/v1/issues/${encodeURIComponent(issueKey)}/attachments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${자리.botKey}`, accept: 'application/json' },
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
    throw new BTS읽기오류(`BTS 이슈 ${issueKey} 를 못 읽었다 (${String(r.status)})`);
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
