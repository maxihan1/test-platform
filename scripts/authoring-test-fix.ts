// BTS 「테스트 수정」 작성의 다시 돌린 횟수 · 고친 곳 한 줄 · 끝내기 result.testFix 를 만든다 (도메인/BTS §3.12 「테스트 수정 바퀴」 2 · §7)
// 앞 판은 자식이 적은 종료 코드(EXIT 0)를 횟수로 읽어 「다시 돌림 0」이 「3번 돌려 보기」와 어긋났다(2026-11-11 실측 PR #713) — 횟수는 기록에서 센다

import { 테스트고침읽기 } from './authoring-apply.js';
import { type 돌린판, 끝기록꼴, 돌린기록들, 판들읽기 } from './authoring-gate3.js';
import type { 보고손 } from './authoring-io.js';
import { 사유거르기 } from './authoring-reverse.js';

const 기기이름: Record<string, string> = { desktop: 'PC', mobile: '휴대폰', android: '폰' };

export interface 다시돌림 {
  /** 고친 케이스 · 기기마다 마지막 전체 돌려 보기에서 돈 횟수 가운데 가장 작은 것. 기록이 없으면 0 */
  횟수: number;
  /** 기기마다 가장 작은 횟수 — 「PC 3 · 휴대폰 3」 */
  기기: [string, number][];
}

/** 고친 케이스 파일(`<폴더>/<tcId>.spec.ts`)이 마지막 전체 돌려 보기에서 기기마다 몇 번 돌았나 — 기기마다 가장 늦은 기록으로 센다 */
export function 다시돌림세기(결과폴더: string, tcIds: readonly string[]): 다시돌림 {
  const 이름들 = new Set(tcIds.map((t) => `${t}.spec.ts`));
  const 판들 = 판들읽기(돌린기록들(결과폴더, 끝기록꼴), true)?.판들 ?? new Map<string, 돌린판[]>();
  const 기기 = new Map<string, number>();
  for (const [열쇠, 판목록] of 판들) {
    const [파일, 이름] = 열쇠.split('\0') as [string, string];
    if (!이름들.has(파일.split('/').pop() ?? '') || 판목록.length === 0) continue;
    const 늦은 = 판목록.reduce((a, b) => (b.시작 > a.시작 ? b : a));
    기기.set(이름, Math.min(기기.get(이름) ?? Infinity, 늦은.상태들.length));
  }
  const 줄 = [...기기].sort(([a], [b]) => a.localeCompare(b));
  return { 횟수: 줄.length === 0 ? 0 : Math.min(...줄.map(([, n]) => n)), 기기: 줄 };
}

/** PR 본문 「테스트 고침」 줄의 횟수 칸 */
export function 다시돌림글(돌림: 다시돌림): string {
  if (돌림.기기.length === 0) return '다시 돌림 0번(마지막 전체 돌려 보기 기록 없음)';
  return `다시 돌림 ${String(돌림.횟수)}번(${돌림.기기.map(([k, n]) => `${기기이름[k] ?? k} ${String(n)}`).join(' · ')})`;
}

const 요약상한 = 500;

/** 자식 결과 요약의 `테스트 고침: BTS <키> · … · 고친 곳 <한 줄>` 들에서 고친 곳만 — 이슈 댓글에 실린다(tpx-author apply.md §7) */
export function 고친곳읽기(자식출력: string): string {
  const 곳들 = [...자식출력.matchAll(/^테스트 고침: BTS .*?· 고친 곳:?\s*(.+)$/gm)].map((m) => m[1]!.trim()).filter((t) => t !== '');
  return 곳들.join(' · ').slice(0, 요약상한);
}

/**
 * 「테스트 수정」 고침 줄이 DONE 으로 끝나면 result.testFix { summary, reruns } 를 싣는다. 다른 줄 · 다른 끝은 그대로다.
 * 고친 곳은 자식이 쓴 글이라 테스트 계정 비밀번호가 섞였으면 싣지 않는다 — 서버가 실패 실행의 비밀값으로 한 번 더 가린다
 */
export function 테스트고침싣는손(손: 보고손, 것: { params?: unknown }, 재료: () => { 자식출력: string; 결과폴더: string; 비밀: readonly string[] }): 보고손 {
  return {
    ...손,
    끝내기: (몸) => {
      const 고침 = 테스트고침읽기(것);
      if (몸.status !== 'DONE' || 고침 === null || 고침 === undefined) return 손.끝내기(몸);
      const { 자식출력, 결과폴더, 비밀 } = 재료();
      const 곳 = 고친곳읽기(자식출력);
      const summary = 사유거르기(곳, 비밀) === 곳 ? 곳 : '';
      const 결과 = typeof 몸.result === 'object' && 몸.result !== null ? (몸.result as Record<string, unknown>) : {};
      const reruns = 다시돌림세기(결과폴더, 고침.cases.map((x) => x.tcId)).횟수;
      return 손.끝내기({ ...몸, result: { ...결과, testFix: { summary, reruns } } });
    },
  };
}
