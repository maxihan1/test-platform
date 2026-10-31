// 수정 AI 가 일을 넘길 BTS 사람 찾기 — 코드 주인 · 고친 줄을 바꾼 사람 → 구성 요소 리드 → 프로젝트 리드 (도메인/BTS 「수정 AI」 넘길 사람)

import { BTS부르기, type BTS자리, type 부르기함수 } from './client.js';

/** 에이전트가 CODEOWNERS · git 기록에서 모은 사람 — 차례가 곧 우선순위다 */
export interface 후보 {
  email: string;
  name: string;
}

// 후보 하나에 BTS 를 두 번까지 부른다. 사람 손에 넘기는 일 하나에 BTS 를 수십 번 두드리지 않게 앞 열 명만 본다
const 후보상한 = 10;

interface 사용자줄 {
  id?: unknown;
  email?: unknown;
}

/**
 * BTS 는 이메일로 찾는 API 가 없다 — 이름 · 아이디(username · 표시 이름)로 찾은 목록에서 이메일이 같은 사람을 고른다(BTS-F6-01 시작 질문 4).
 * 찾는 낱말은 이름과 이메일 앞부분이다. BTS 사용자에 「활성」 칸이 없어 찾으면 그 사람으로 친다
 */
export async function 이메일로찾기(자리: BTS자리, 사람: 후보, 부르기: 부르기함수): Promise<string | null> {
  const 메일 = 사람.email.trim().toLowerCase();
  if (!메일.includes('@')) return null;
  const 낱말들 = [...new Set([사람.name.trim(), 메일.split('@')[0]!].filter((x) => x !== ''))];
  for (const 낱말 of 낱말들) {
    const r = await 부르기(자리, 'GET', `/api/v1/users?query=${encodeURIComponent(낱말)}`);
    if (r.status !== 200) continue;
    // 사용자 목록만 data 로 감싸지 않은 배열이다 — 감싼 꼴이 와도 읽는다
    const 줄들 = (Array.isArray(r.json) ? r.json : ((r.json as { data?: unknown } | null)?.data ?? [])) as 사용자줄[];
    const 맞은 = Array.isArray(줄들) ? 줄들.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === 메일 && typeof u.id === 'string') : undefined;
    if (맞은 !== undefined) return 맞은.id as string;
  }
  return null;
}

/** 이슈 구성 요소의 리드 — 구성 요소 차례대로 처음 리드가 있는 것 */
async function 구성요소리드(자리: BTS자리, btsProject: string, componentIds: string[], 부르기: 부르기함수): Promise<string | null> {
  if (componentIds.length === 0) return null;
  const r = await 부르기(자리, 'GET', `/api/v1/projects/${encodeURIComponent(btsProject)}/components`);
  if (r.status !== 200) return null;
  const 목록 = ((r.json as { data?: { id?: unknown; leadUserId?: unknown }[] } | null)?.data ?? []).filter((c) => typeof c.leadUserId === 'string');
  for (const id of componentIds) {
    const 리드 = 목록.find((c) => c.id === id)?.leadUserId;
    if (typeof 리드 === 'string') return 리드;
  }
  return null;
}

/** 프로젝트 리드 — BTS 에 「기본 담당자」가 없어 이것으로 대신한다(BTS-F6-01 시작 질문 4) */
async function 프로젝트리드(자리: BTS자리, btsProject: string, 부르기: 부르기함수): Promise<string | null> {
  const r = await 부르기(자리, 'GET', `/api/v1/projects/${encodeURIComponent(btsProject)}/lead`);
  const 리드 = (r.json as { data?: { leadUserId?: unknown } } | null)?.data?.leadUserId;
  return r.status === 200 && typeof 리드 === 'string' ? 리드 : null;
}

/**
 * 넘길 BTS 사람 번호(UUID). 아무도 없으면 null — 그때는 담당자를 바꾸지 않고 댓글로 사람에게 알린다.
 * BTS 가 깨져도 던지지 않는다 — 넘길 사람을 못 찾았다고 PR · 분석 결과를 버리지 않는다
 */
export async function 넘길사람찾기(
  자리: BTS자리,
  btsProject: string,
  후보들: readonly 후보[],
  componentIds: string[],
  부르기: 부르기함수 = BTS부르기,
): Promise<string | null> {
  try {
    for (const 사람 of 후보들.slice(0, 후보상한)) {
      const id = await 이메일로찾기(자리, 사람, 부르기);
      if (id !== null) return id;
    }
    return (await 구성요소리드(자리, btsProject, componentIds, 부르기)) ?? (await 프로젝트리드(자리, btsProject, 부르기));
  } catch (err) {
    console.error(`[bts] 넘길 사람을 찾다 BTS 에 닿지 않았다: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * 「QA Hub AI」 열쇠의 BTS 사람 번호 — 이슈 담당자가 자기인지 본다. whoami 는 감싸지 않은 꼴이다.
 * 못 읽으면 던진다 — 조용히 「내 것이 아님」으로 치면 BTS 가 잠깐 아플 때 담당 신호를 영영 놓친다(규칙 문이 503)
 */
export async function 내번호(자리: BTS자리, 부르기: 부르기함수 = BTS부르기): Promise<string> {
  const r = await 부르기(자리, 'GET', '/api/v1/users/me/whoami');
  const 몸 = r.json as { userId?: unknown; data?: { userId?: unknown } } | null;
  const id = 몸?.userId ?? 몸?.data?.userId;
  if (r.status !== 200 || typeof id !== 'string') throw new Error(`BTS whoami 를 못 읽었다 (${String(r.status)})`);
  return id;
}
