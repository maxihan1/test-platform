// 다시 배포로 거둔 롤백 되돌림 요청의 PR 을 닫고, 수정 AI PR 의 병합 · 닫힘을 서버에 적는다 — 작성 에이전트가 서비스마다 1분에 한 번 부른다. 서버는 GitHub 열쇠가 없다 (도메인/BTS §7 「닫을 PR」 · 「수정 PR 상태」 · BTS-F7-01 · F8-01)

type 부르기 = (길: string, 옵션?: { method: string; body?: unknown }) => Promise<{ status: number; 몸: unknown }>;
type 치기 = (인자: string[]) => { ok: boolean; 낸것: string; 까닭: string };

const 닫는글 = '롤백 뒤 다시 배포되어 이 되돌림 PR 은 쓰지 않습니다 (Test Commander)';

/** 브랜치는 지우지 않는다 — 폐기한 작성의 author-<번호> 브랜치는 남긴다(작성 §7 discard) */
export const PR닫기인자 = (prUrl: string): string[] => ['pr', 'close', prUrl, '--comment', 닫는글];

/**
 * 닫을 PR 을 묻고 닫는다. 이미 닫혔거나 병합된 PR 도 닫음으로 적는다 — 안 적으면 목록에서 영영 안 빠진다.
 * 상태를 못 읽으면 적지 않고 1분 뒤 다시 본다. 닫은 수를 준다
 */
export async function 닫을PR처리(서비스: string, 부른다: 부르기, gh: 치기): Promise<number> {
  const 답 = await 부른다(`/authoring/requests/closing?service=${encodeURIComponent(서비스)}`);
  if (답.status !== 200) return 0;
  const prs = (답.몸 as { prs?: { id: number; prUrl: string }[] } | null)?.prs ?? [];
  let 닫음 = 0;
  for (const { id, prUrl } of prs) {
    const 친것 = gh(PR닫기인자(prUrl));
    if (!친것.ok) {
      const 상태 = gh(['pr', 'view', prUrl, '--json', 'state', '-q', '.state']);
      if (!상태.ok || !['CLOSED', 'MERGED'].includes(상태.낸것.trim())) {
        console.error(`[작성] ${서비스} 되돌림 PR ${prUrl} 을 못 닫았다 — 다음에 다시: ${친것.까닭}`);
        continue;
      }
    }
    const 적음 = await 부른다(`/authoring/requests/${String(id)}/closed`, { method: 'POST' });
    if (적음.status !== 204) {
      console.error(`[작성] ${서비스} 되돌림 PR ${prUrl} 은 닫았는데 서버에 못 적었다(${String(적음.status)}) — 다음에 다시 적는다`);
      continue;
    }
    닫음++;
  }
  return 닫음;
}

/**
 * 수정 AI 가 연 PR 가운데 병합 · 닫힘으로 끝난 것을 서버에 적는다(대시보드 「수정 AI」 셈 — BTS-F8-01).
 * 열린 PR · 상태를 못 읽은 PR 은 안 적고 1분 뒤 다시 본다. 적은 수를 준다
 */
export async function 수정PR상태처리(서비스: string, 부른다: 부르기, gh: 치기): Promise<number> {
  const 답 = await 부른다(`/authoring/requests/bugfix-prs?service=${encodeURIComponent(서비스)}`);
  if (답.status !== 200) return 0;
  const prs = (답.몸 as { prs?: { id: number; prUrl: string }[] } | null)?.prs ?? [];
  let 적은수 = 0;
  for (const { id, prUrl } of prs) {
    const 상태 = gh(['pr', 'view', prUrl, '--json', 'state', '-q', '.state']);
    const state = 상태.낸것.trim();
    if (!상태.ok || (state !== 'MERGED' && state !== 'CLOSED')) continue;
    const 적음 = await 부른다(`/authoring/requests/${String(id)}/pr-state`, { method: 'POST', body: { state } });
    if (적음.status !== 204) {
      console.error(`[작성] ${서비스} 수정 PR ${prUrl} 이 ${state} 인데 서버에 못 적었다(${String(적음.status)}) — 다음에 다시 적는다`);
      continue;
    }
    적은수++;
  }
  return 적은수;
}
