// 끝났다는 보고가 거절됐을 때 대신 보낼 몸 — 셈 · 만든 케이스만 거절됐으면 그 칸만 뺀다 (도메인/작성 §7 finish). authoring-io.ts 가 300줄을 넘어 뗐다

/**
 * 끝났다는 보고가 400 으로 거절되면 대신 보낼 실패 보고. 뒤처리가 없으면 행이 RUNNING 으로 남는다 —
 * 5877 은 서비스 저장소가 비어 PR 주소가 BAD_PR_URL 로 거절되고 작성 중에 멈춰 있었다 (2026-09-29).
 * PR 주소는 까닭 글에 싣는다 — 거절된 칸을 또 보내면 또 거절된다.
 * **셈(result.coverage)만 거절됐으면 셈만 뺀 같은 몸**이다 — 실패로 바꾸면 PR · 보류 · 이어하기를 잃는다 (§3.6 「★ 원장」).
 * 만든 케이스(result.cases)가 BAD_CASES 로 거절돼도 목록만 뺀다
 */
export function 거절된보고대신(
  상태: number,
  답몸: unknown,
  보낸것: Record<string, unknown>,
): Record<string, unknown> | null {
  const 까닭 = (답몸 as { error?: unknown } | null)?.error;
  const 결과 = 보낸것.result;
  const 실렸나 = (키: string) => typeof 결과 === 'object' && 결과 !== null && 키 in 결과;
  // 만든 케이스(result.cases)도 같다 — BAD_CASES 면 목록만 뺀다 (§7 finish)
  // 413 은 본문 상한이다 — 셈이 실린 몸이면 셈이 넘친 것이라 셈만 뺀다. 둘 다 실렸으면 큰 쪽인 케이스 목록을 먼저 뺀다. 아무것도 없는 413 은 전처럼 그대로 돌려준다
  const 뺄것 =
    상태 === 400 && 까닭 === 'BAD_COVERAGE' && 실렸나('coverage')
      ? 'coverage'
      : 상태 === 400 && 까닭 === 'BAD_CASES' && 실렸나('cases')
        ? 'cases'
        : 상태 === 413
          ? 실렸나('cases')
            ? 'cases'
            : 실렸나('coverage')
              ? 'coverage'
              : null
          : null;
  if (뺄것 !== null) {
    const { [뺄것]: _뺀것, ...남은결과 } = 결과 as Record<string, unknown>;
    const { result: _옛결과, ...남은몸 } = 보낸것;
    return Object.keys(남은결과).length === 0 ? 남은몸 : { ...남은몸, result: 남은결과 };
  }
  if (상태 !== 400) return null;
  const pr = typeof 보낸것.prUrl === 'string' ? ` — PR ${보낸것.prUrl}` : '';
  return { status: 'FAILED', error: `끝났다는 보고를 서버가 거절했다 (${String(까닭 ?? 400)})${pr}` };
}
