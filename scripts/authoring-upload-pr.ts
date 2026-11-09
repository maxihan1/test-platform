// 올리기의 마지막 — 자기 브랜치(author-<뿌리>)에 push 하고 초안 PR 을 만들거나 이어 쓴다. authoring-upload.ts 가 300줄을 넘어 뗐다

import { PR만들기인자, PR본문고치기인자, PR찾기인자, push실패, 덮어쓸수없는까닭, 커밋메시지, 푸시인자 } from './authoring-chain.js';
import { type 친다, 다시하며 } from './authoring-io.js';

type 트리손 = (명령: string, 인자: string[]) => ReturnType<typeof 친다>;

/**
 * 훅은 안 돈다(사본환경) — 트리의 훅은 자식이 쓴 것이다. 같은 검사(타입 · K 규칙)는 자기 저장소면 CI 의 가벼운 길이, 대상 저장소면 병합 직전 검사가 한다.
 * `PR저장소` 는 대상 저장소의 `<소유자>/<이름>` — 자기 저장소는 undefined 라 gh 인자가 지금 모양 그대로다. 까닭은 사람이 읽는 실패 글 그대로 낸다
 */
export async function 올리고PR(
  트리에서: 트리손,
  재료: { 번호: number; 뿌리: number; 서비스: string; 본문: string; PR저장소: string | undefined },
): Promise<{ 주소: string } | { 까닭: string }> {
  const { 뿌리 } = 재료;
  // 요청 하나에 브랜치 하나(author-<뿌리>) — 사람이 올린 커밋이 머리에 있으면 덮어쓰지 않는다 (§7 「실행 기록」)
  const 올림 = await 다시하며('push', () => {
    const 남의것 = 덮어쓸수없는까닭(트리에서, 뿌리);
    if (남의것 !== null) return 남의것;
    const r = 트리에서('git', 푸시인자(뿌리));
    return r.ok ? { 값: true } : push실패(r);
  });
  if ('까닭' in 올림) return { 까닭: `push 가 실패했다: ${올림.까닭}` };

  // 재시도 전에 먼저 찾는다 — 만들기가 GitHub 에선 됐는데 답만 잃었으면 또 만들면 PR 이 둘이 된다
  const PR = await 다시하며<string>('PR 만들기', () => {
    const 있나 = 트리에서('gh', PR찾기인자(뿌리, 재료.PR저장소));
    const 있는것 = 있나.ok ? (JSON.parse(있나.낸것 || '[]') as { url: string }[])[0]?.url : undefined;
    if (있는것 !== undefined) {
      if (!트리에서('gh', PR본문고치기인자(있는것, 재료.본문)).ok) console.error(`[작성] ${재료.번호}번 PR 본문을 못 고쳤다 — 옛 본문이 남는다`);
      return { 값: 있는것 };
    }
    const r = 트리에서('gh', PR만들기인자(뿌리, 커밋메시지(뿌리, 재료.서비스), 재료.본문, 재료.PR저장소));
    const 주소 = r.낸것.trim().split('\n').pop() ?? '';
    return r.ok && 주소.startsWith('https://') ? { 값: 주소 } : { 까닭: r.까닭 || 'PR 주소가 안 찍혔다' };
  });
  return '까닭' in PR ? { 까닭: `PR 을 못 만들었다: ${PR.까닭}` } : { 주소: PR.값 };
}
