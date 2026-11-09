// 작성 에이전트가 병합 직전에 PR 의 바뀐 파일을 어떻게 읽고 언제 병합을 막는지 정하는 순수 함수
import { 머지거부사유 } from './authoring-chain.js';
import type { 바뀐것 } from './authoring-conflicts-apply.js';
import { 바탕파일거부사유 } from './authoring-repo-base.js';

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
  /** 판정 스크립트는 바탕 파일을 이름만 보고 받는다 — 없던 것을 고정 글로 새로 만든 것인지는 이것이 본다 (authoring-repo-base) */
  바탕: (파일들: string[], 기준: string, 머리: string) => string | null;
}): string | null {
  const { 메인, 머리 } = 입력;
  if ('까닭' in 메인) return `최신 main 을 못 받아 판정을 못 했다: ${메인.까닭}`;
  if ('까닭' in 머리) return `PR 머리를 못 받아 판정을 못 했다: ${머리.까닭}`;
  const 목록 = 입력.목록(메인.sha, 머리.sha);
  if (!목록.ok) return `PR 의 바뀐 파일을 못 읽었다: ${목록.까닭}`;
  const 파일들 = 목록.낸것.split('\n').filter((f) => f !== '');
  return 머지거부사유(입력.테스트만(파일들, 메인.sha), 파일들) ?? 입력.바탕(파일들, 메인.sha, 머리.sha);
}

/** `병합직전막힘` 의 바탕 파일 확인 — 기준에 있었나와 병합할 머리의 글을 그 저장소 git 에서 읽는다 */
export function 바탕보기(깃: (인자: string[]) => 친결과, 대상: boolean): (파일들: string[], 기준: string, 머리: string) => string | null {
  return (파일들, 기준, 머리) =>
    바탕파일거부사유(
      파일들,
      (f) => 깃(['cat-file', '-e', `${기준}:${f}`]).ok,
      (f) => {
        const r = 깃(['show', `${머리}:${f}`]);
        return r.ok ? r.낸것 : null;
      },
      대상,
    );
}

/**
 * 병합 끝내기 몸. `pulled` 는 「에이전트 쪽에서 더 당길 것이 없다」다 — 자기 저장소는 맥 체크아웃을 실제로 당겼을 때만 true(서버가 그때만 저장값을 지운다),
 * 대상 저장소는 에이전트가 당길 체크아웃이 없어 늘 true 다(서버가 그 저장소를 받아 온 뒤 훑는다).
 * 겹침으로 바뀐 번호(`mergedAs`)는 작성 상세의 고리다(리뷰 M6)
 */
export function 머지끝몸(상태: string, prUrl: string, 까닭: string, 당김: boolean | null, 바뀐것: 바뀐것[] = []): Record<string, unknown> {
  if (상태 === 'MERGED') {
    const mergedAs = Object.fromEntries(바뀐것.map((b) => [b.옛, '새' in b ? b.새 : null]));
    return { status: 'DONE', prUrl, result: { pulled: 당김 === true, ...(바뀐것.length > 0 ? { mergedAs } : {}) } };
  }
  return { status: 'FAILED', error: `병합이 안 됐다 (${상태}): ${까닭 || '충돌이나 보호 규칙을 봐라'}` };
}

/**
 * 병합 뒤 PR 상태. 병합 명령이 성공(EXIT 0)했으면 상태를 못 읽거나 못 풀어도 병합된 것으로 본다 —
 * 된 병합을 FAILED 로 덮으면 사람이 또 누르고, 그 요청은 끝내 실패로 남는다
 */
export function 병합뒤상태(병합됨: boolean, 뷰: { ok: boolean; 낸것: string }): string {
  const 모름 = 병합됨 ? 'MERGED' : '못 읽음';
  if (!뷰.ok) return 모름;
  try {
    return (JSON.parse(뷰.낸것) as { state: string }).state;
  } catch (e) {
    console.error(`[머지] 병합 뒤 PR 상태를 못 풀었다: ${e instanceof Error ? e.message : String(e)}`);
    return 모름;
  }
}
