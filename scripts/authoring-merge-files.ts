// 작성 에이전트가 병합 직전에 PR 의 바뀐 파일을 어떻게 읽고 언제 병합을 막는지 정하는 순수 함수
import { 머지거부사유 } from './authoring-chain.js';

type 친결과 = { ok: boolean; 낸것: string; 까닭: string };
type 받은커밋 = { sha: string } | { 까닭: string };

/**
 * 병합 직전 판정을 한 줄로. 올릴 때 판정했어도 그 뒤 누가 브랜치에 더 얹었을 수 있다.
 * 앞 단계가 먼저 걸린다 — main → 머리 → 목록 → 테스트만.
 * `머리` 는 병합할 커밋(`--match-head-commit` 에 넣는 것)을 받아 둔 것이다. 목록은 그 커밋과 main 의 로컬 diff 라
 * 병합할 커밋에 묶인다 — GitHub 파일 API 는 커밋을 못 집고 3000 개에서 끊겼다(2026-10-07 #167 → AUT-F3-48).
 * 목록은 `--no-renames` 라 이름 바꾼 파일의 옛 경로도 든다 — 코드 파일을 tests/ 로 옮긴 PR 이 「테스트만」으로 못 지나간다.
 * 목록 · `테스트만` 은 앞이 다 통과했을 때만 부른다 — 동기 호출이라 미리 몰아 치면
 * 그동안 생존 신호(30초)가 끊기고 서버는 3분이면 죽었다고 본다(authoring-heartbeat)
 */
export function 병합직전막힘(입력: {
  메인: 받은커밋;
  머리: 받은커밋;
  목록: (기준: string, 머리: string) => 친결과;
  테스트만: (파일들: string[], 기준: string) => boolean;
}): string | null {
  const { 메인, 머리 } = 입력;
  if ('까닭' in 메인) return `최신 main 을 못 받아 판정을 못 했다: ${메인.까닭}`;
  if ('까닭' in 머리) return `PR 머리를 못 받아 판정을 못 했다: ${머리.까닭}`;
  const 목록 = 입력.목록(메인.sha, 머리.sha);
  if (!목록.ok) return `PR 의 바뀐 파일을 못 읽었다: ${목록.까닭}`;
  const 파일들 = 목록.낸것.split('\n').filter((f) => f !== '');
  return 머지거부사유(입력.테스트만(파일들, 메인.sha), 파일들);
}
