// 경로(:runId · :id 같은 자리)에 실려 온 번호를 검사하는 한 자리. 컨텍스트마다 따로 적으면 규칙이 갈린다

// 같은 규칙이 reporting 과 execution 에 따로 적혀 있다가 갈라졌다 — 한쪽은 n > 0 을 보고
// 다른 쪽은 Number.isInteger 만 봤다. 한 자리에 두면 라우트가 늘어도 같은 규칙이 따라간다.
// 어느 한쪽 컨텍스트가 아니라 db/index.ts 처럼 둘 위에 둔다. 갈래끼리 부르면 한쪽을 고칠 때 남이 깨진다

/**
 * 경로 번호를 정수로 읽는다. 규칙에 어긋나면 null — 부르는 쪽이 400 으로 답한다.
 *
 * **auth/scope.ts 의 `번호로()` 와 같은 규칙이어야 한다.** 문과 라우트가 다른 값을 보면,
 * 문이 통과시킨 번호를 라우트가 다른 자원으로 읽는다 (그 등식이 2026-09-19 에 `/api/runs/1e3`
 * 구멍을 막은 근거다). `Number()` 만 쓰면 `0x10`·`1e3`·`' 1 '`·`'+1'` 이 새므로 글자 모양부터 본다.
 *
 * 상한이 `Number.isSafeInteger` 인 것은 id 칸이 전부 `BIGSERIAL` 이라
 * 자바스크립트가 정확히 셀 수 있는 한계가 실질 상한이기 때문이다. 이게 없으면 스물한 자리 숫자가
 * 그대로 Postgres 로 가 범위 초과가 잡히지 않은 500 이 된다.
 */
export function 정수(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
}
