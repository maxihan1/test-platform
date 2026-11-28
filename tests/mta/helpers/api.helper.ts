import { 서버 } from './app.helper.js';
import { 살아있는토큰받기, 토큰버리기 } from './login-inject.helper.js';

export type 계정 = { 아이디: string; 암호: string };

export type 계정정보 = { id: string; username: string; acct: string; display_name: string; locked?: boolean; bot?: boolean };

export type 투표 = { id: string; expired: boolean; multiple: boolean; voted?: boolean; options: { title: string; votes_count: number | null }[] };

export type 글 = {
  id: string;
  url: string | null;
  uri: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  spoiler_text: string;
  sensitive: boolean;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  language: string | null;
  in_reply_to_id: string | null;
  reblog: 글 | null;
  poll: 투표 | null;
  card: { url: string; title: string } | null;
  media_attachments: { id: string; type: string; description: string | null }[];
  quote?: { state?: string; quoted_status?: 글 | null } | null;
  quote_approval?: { automatic?: string[]; manual?: string[]; current_user?: string } | null;
  account: 계정정보;
  favourited?: boolean;
  reblogged?: boolean;
  pinned?: boolean;
};

export type 필터 = { id: string; title: string; context: string[]; filter_action: string };
export type 목록 = { id: string; title: string };
export type 관계 = { id: string; following: boolean; followed_by: boolean; blocking: boolean; muting: boolean; requested: boolean; note: string };

export function 계정꺼내기(아이디: string | undefined, 암호: string | undefined, 역할 = '일반 회원'): 계정 {
  if (!아이디 || !암호) throw new Error(`「${역할}」 계정 값이 비어 있다 — 대상 서버 계정(PLATFORM_ACCOUNTS)이 채워지지 않았다`);
  return { 아이디, 암호 };
}

async function 한번부르기(토큰: string, 방법: string, 경로: string, 본문?: unknown): Promise<Response> {
  return fetch(new URL(경로, `https://${서버}`), {
    method: 방법,
    headers: { authorization: `Bearer ${토큰}`, ...(본문 === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(본문 === undefined ? {} : { body: JSON.stringify(본문) }),
    signal: AbortSignal.timeout(20_000),
  });
}

export async function api<T>(누구: 계정, 방법: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', 경로: string, 본문?: unknown): Promise<T> {
  let { token } = await 살아있는토큰받기(누구.아이디, 누구.암호);
  let res = await 한번부르기(token, 방법, 경로, 본문);
  if (res.status === 401) {
    토큰버리기(누구.아이디, 누구.암호);
    token = (await 살아있는토큰받기(누구.아이디, 누구.암호)).token;
    res = await 한번부르기(token, 방법, 경로, 본문);
  }
  const 글자 = await res.text();
  if (!res.ok) throw new Error(`${방법} ${경로.replace(/\?.*/, '')} 실패 — HTTP ${String(res.status)} ${글자.slice(0, 200)}`);
  return (글자 === '' ? {} : JSON.parse(글자)) as T;
}

export async function 토큰없이부르기(경로: string): Promise<{ 코드: number; 본문: unknown }> {
  const res = await fetch(new URL(경로, `https://${서버}`), { signal: AbortSignal.timeout(20_000) });
  const 글자 = await res.text();
  let 본문: unknown = 글자;
  try {
    본문 = JSON.parse(글자);
  } catch {
    본문 = 글자;
  }
  return { 코드: res.status, 본문 };
}

export function 글자만(html: string): string {
  return html
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p><p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function 내정보(누구: 계정): Promise<계정정보 & { source?: { privacy?: string; indexable?: boolean; discoverable?: boolean } }> {
  return api(누구, 'GET', '/api/v1/accounts/verify_credentials');
}

export function 계정찾기(누구: 계정, 사용자명: string): Promise<계정정보> {
  return api(누구, 'GET', `/api/v1/accounts/lookup?acct=${encodeURIComponent(사용자명)}`);
}

export async function 관계보기(누구: 계정, 사용자명: string): Promise<관계> {
  const 대상 = await 계정찾기(누구, 사용자명);
  const 줄 = await api<관계[]>(누구, 'GET', `/api/v1/accounts/relationships?id[]=${대상.id}`);
  const 첫 = 줄[0];
  if (!첫) throw new Error(`${사용자명} 관계를 읽지 못했다`);
  return 첫;
}

export type 글옵션 = {
  visibility?: 글['visibility'];
  spoiler_text?: string;
  sensitive?: boolean;
  in_reply_to_id?: string;
  quoted_status_id?: string;
  language?: string;
  poll?: { options: string[]; expires_in: number; multiple?: boolean };
};

export function 글쓰기(누구: 계정, 본문: string, 옵션: 글옵션 = {}): Promise<글> {
  return api<글>(누구, 'POST', '/api/v1/statuses', { status: 본문, ...옵션 });
}

export function 글고치기(누구: 계정, id: string, 본문: string, 옵션: { spoiler_text?: string; sensitive?: boolean } = {}): Promise<글> {
  return api<글>(누구, 'PUT', `/api/v1/statuses/${id}`, { status: 본문, ...옵션 });
}

export function 글읽기(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'GET', `/api/v1/statuses/${id}`);
}

export async function 글지우기(누구: 계정, id: string): Promise<void> {
  try {
    await api(누구, 'DELETE', `/api/v1/statuses/${id}`);
  } catch (err) {
    if (!(err instanceof Error) || !/HTTP 404/.test(err.message)) throw err;
  }
}

export async function 사람글들(누구: 계정, 사용자명: string, 옵션: { 답글빼기?: boolean; 개수?: number } = {}): Promise<글[]> {
  const 대상 = await 계정찾기(누구, 사용자명);
  const 물음 = new URLSearchParams({ limit: String(옵션.개수 ?? 40) });
  if (옵션.답글빼기) 물음.set('exclude_replies', 'true');
  return api<글[]>(누구, 'GET', `/api/v1/accounts/${대상.id}/statuses?${물음.toString()}`);
}

export async function 사람글찾기(누구: 계정, 사용자명: string, 조건: (x: 글) => boolean, 설명: string): Promise<글> {
  const 찾음 = (await 사람글들(누구, 사용자명)).find(조건);
  if (!찾음) throw new Error(`${사용자명} 의 글 가운데 「${설명}」 글이 없다`);
  return 찾음;
}

export async function 내글지우기(누구: 계정, 머리: string): Promise<number> {
  const 나 = await 내정보(누구);
  const 글들 = await api<글[]>(누구, 'GET', `/api/v1/accounts/${나.id}/statuses?limit=40`);
  let 수 = 0;
  for (const x of 글들) {
    if (x.reblog) continue;
    if (글자만(x.content).startsWith(머리) || x.spoiler_text.startsWith(머리)) {
      await 글지우기(누구, x.id);
      수++;
    }
  }
  return 수;
}

export function 좋아요(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'POST', `/api/v1/statuses/${id}/favourite`);
}
export function 좋아요취소(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'POST', `/api/v1/statuses/${id}/unfavourite`);
}
export function 부스트(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'POST', `/api/v1/statuses/${id}/reblog`);
}
export function 부스트취소(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'POST', `/api/v1/statuses/${id}/unreblog`);
}
export function 고정(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'POST', `/api/v1/statuses/${id}/pin`);
}
export function 고정해제(누구: 계정, id: string): Promise<글> {
  return api<글>(누구, 'POST', `/api/v1/statuses/${id}/unpin`);
}
export function 투표하기(누구: 계정, 투표id: string, 고른것: number[]): Promise<투표> {
  return api<투표>(누구, 'POST', `/api/v1/polls/${투표id}/votes`, { choices: 고른것 });
}

async function 관계바꾸기(누구: 계정, 사용자명: string, 동작: string, 본문?: unknown): Promise<관계> {
  const 대상 = await 계정찾기(누구, 사용자명);
  return api<관계>(누구, 'POST', `/api/v1/accounts/${대상.id}/${동작}`, 본문);
}
export const 팔로우 = (누구: 계정, 사용자명: string, 새글알림?: boolean): Promise<관계> =>
  관계바꾸기(누구, 사용자명, 'follow', 새글알림 === undefined ? undefined : { notify: 새글알림 });
export const 언팔로우 = (누구: 계정, 사용자명: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'unfollow');
export const 뮤트 = (누구: 계정, 사용자명: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'mute');
export const 뮤트해제 = (누구: 계정, 사용자명: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'unmute');
export const 차단 = (누구: 계정, 사용자명: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'block');
export const 차단해제 = (누구: 계정, 사용자명: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'unblock');
export const 메모쓰기 = (누구: 계정, 사용자명: string, 메모: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'note', { comment: 메모 });
export const 팔로워빼기 = (누구: 계정, 사용자명: string): Promise<관계> => 관계바꾸기(누구, 사용자명, 'remove_from_followers');

export function 필터들(누구: 계정): Promise<필터[]> {
  return api<필터[]>(누구, 'GET', '/api/v2/filters');
}

export function 필터만들기(
  누구: 계정,
  제목: string,
  낱말들: string[],
  범위: ('home' | 'notifications' | 'public' | 'thread' | 'account')[] = ['home', 'notifications', 'public', 'thread', 'account'],
  동작: 'warn' | 'hide' = 'warn',
): Promise<필터> {
  return api<필터>(누구, 'POST', '/api/v2/filters', {
    title: 제목,
    context: 범위,
    filter_action: 동작,
    keywords_attributes: 낱말들.map((keyword) => ({ keyword, whole_word: false })),
  });
}

export async function 필터지우기(누구: 계정, 머리: string): Promise<number> {
  let 수 = 0;
  for (const x of await 필터들(누구)) {
    if (x.title.startsWith(머리)) {
      await api(누구, 'DELETE', `/api/v2/filters/${x.id}`);
      수++;
    }
  }
  return 수;
}

export function 목록들(누구: 계정): Promise<목록[]> {
  return api<목록[]>(누구, 'GET', '/api/v1/lists');
}

export async function 목록홈숨김(누구: 계정, 이름: string, 켜기: boolean): Promise<void> {
  const 목록 = (await 목록들(누구)).find((x) => x.title === 이름);
  if (목록 === undefined) throw new Error(`목록 「${이름}」이 없다`);
  await api(누구, 'PUT', `/api/v1/lists/${목록.id}`, { exclusive: 켜기 });
}

export async function 목록지우기(누구: 계정, 머리: string): Promise<number> {
  let 수 = 0;
  for (const x of await 목록들(누구)) {
    if (x.title.startsWith(머리)) {
      await api(누구, 'DELETE', `/api/v1/lists/${x.id}`);
      수++;
    }
  }
  return 수;
}

export async function 마커읽기(누구: 계정, 어디: 'home' | 'notifications'): Promise<{ last_read_id: string; updated_at: string } | undefined> {
  const 답 = await api<Record<string, { last_read_id: string; updated_at: string } | undefined>>(누구, 'GET', `/api/v1/markers?timeline[]=${어디}`);
  return 답[어디];
}

export function 게시설정읽기(누구: 계정): Promise<Record<string, unknown>> {
  return api<Record<string, unknown>>(누구, 'GET', '/api/v1/preferences');
}

export function 푸시구독읽기(누구: 계정): Promise<{ id: string; endpoint: string; alerts: Record<string, boolean> }> {
  return api(누구, 'GET', '/api/v1/push/subscription');
}

export async function 푸시구독찾기(누구: 계정): Promise<{ id: string; endpoint: string; alerts: Record<string, boolean> } | undefined> {
  const { token } = await 살아있는토큰받기(누구.아이디, 누구.암호);
  const res = await 한번부르기(token, 'GET', '/api/v1/push/subscription');
  if (res.status === 404) return undefined;
  const 글자 = await res.text();
  if (!res.ok) throw new Error(`GET /api/v1/push/subscription 실패 — HTTP ${String(res.status)} ${글자.slice(0, 200)}`);
  return JSON.parse(글자) as { id: string; endpoint: string; alerts: Record<string, boolean> };
}

export function 해시태그팔로우(누구: 계정, 태그: string, 켜기: boolean): Promise<{ name: string; following: boolean }> {
  return api(누구, 'POST', `/api/v1/tags/${encodeURIComponent(태그)}/${켜기 ? 'follow' : 'unfollow'}`);
}

export async function 알림들(누구: 계정, 종류?: string[]): Promise<{ id: string; type: string; account: 계정정보; status?: 글 | null }[]> {
  const 물음 = (종류 ?? []).map((x) => `types[]=${x}`).join('&');
  return api(누구, 'GET', `/api/v1/notifications?limit=40${물음 ? `&${물음}` : ''}`);
}

export function 알림요청들(누구: 계정): Promise<{ id: string; account: 계정정보; notifications_count: string }[]> {
  return api(누구, 'GET', '/api/v1/notifications/requests');
}

export function 계정설정바꾸기(누구: 계정, 값: Record<string, string | boolean>): Promise<계정정보> {
  return api(누구, 'PATCH', '/api/v1/accounts/update_credentials', 값);
}

export function 멘션보내기(보내는: 계정, 받는사용자명: string, 본문: string, 공개범위: 글['visibility'] = 'public'): Promise<글> {
  return 글쓰기(보내는, `@${받는사용자명} ${본문}`, { visibility: 공개범위 });
}
