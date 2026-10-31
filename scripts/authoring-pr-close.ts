// 다시 배포로 거둔 롤백 되돌림 요청의 PR 을 닫는다 — 줄이 비어 쉬는 틈에 부른다. 서버는 GitHub 열쇠가 없다 (도메인/BTS §7 「닫을 PR」 · BTS-F7-01)

type 부르기 = (길: string, 옵션?: { method: string }) => Promise<{ status: number; 몸: unknown }>;
type 치기 = (인자: string[]) => { ok: boolean; 낸것: string; 까닭: string };

const 닫는글 = '롤백 뒤 다시 배포되어 이 되돌림 PR 은 쓰지 않습니다 (QA Hub)';

/** 브랜치는 지우지 않는다 — 폐기한 작성의 author-<번호> 브랜치는 남긴다(작성 §7 discard) */
export const PR닫기인자 = (prUrl: string): string[] => ['pr', 'close', prUrl, '--comment', 닫는글];

/**
 * 닫을 PR 을 묻고 닫는다. 이미 닫혔거나 병합된 PR 도 닫음으로 적는다 — 안 적으면 목록에서 영영 안 빠진다.
 * 상태를 못 읽으면 적지 않고 다음 쉬는 틈에 다시 본다. 닫은 수를 준다
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
    await 부른다(`/authoring/requests/${String(id)}/closed`, { method: 'POST' });
    닫음++;
  }
  return 닫음;
}
