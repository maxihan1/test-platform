// 경로(:runId · :id 같은 자리)에 실려 온 번호를 검사하는 한 자리. 컨텍스트마다 따로 적으면 규칙이 갈린다

// 같은 규칙이 reporting 과 execution 에 따로 적혀 있다가 갈라졌다 — 한쪽은 n > 0 을 보고
// 다른 쪽은 Number.isInteger 만 봤다. 한 자리에 두면 라우트가 늘어도 같은 규칙이 따라간다.
// 어느 한쪽 컨텍스트가 아니라 db/index.ts 처럼 둘 위에 둔다. 갈래끼리 부르면 한쪽을 고칠 때 남이 깨진다

// Number.isInteger(1e21) 은 true 다. 상한이 없으면 그 값이 그대로 Postgres 로 가
// 범위를 벗어난 숫자로 잡히지 않은 500 이 된다. 실제 번호는 이 근처에도 오지 않는다
const 상한 = 2_147_483_647;

/** 경로 번호를 정수로 읽는다. 규칙에 어긋나면 null — 부르는 쪽이 400 으로 답한다 */
export function 정수(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 상한 ? n : null;
}
