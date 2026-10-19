// 보류 입력 · 겹침 결정에 적힌 「한 사람」을 아이디에서 계정 이름으로 바꿔 화면에 주는 도우미

/**
 * 저장할 때는 아이디(`by`)를 적고, 응답에서만 이름으로 바꾼다. 아이디는 계정 이름을 고쳐도 같은 사람을 가리키는 열쇠라 저장은 그대로 둔다.
 * 계정이 지워졌거나 아이디가 비었으면 적힌 것을 그대로 돌려준다 — 이름이 없다고 입력이 사라지면 안 된다
 */
export async function 입력자이름으로<T extends { by: string }>(입력들: (T | null)[]): Promise<(T | null)[]> {
  const 아이디들 = [...new Set(입력들.flatMap((입력) => (입력 === null || 입력.by === '' ? [] : [입력.by])))];
  if (아이디들.length === 0) return 입력들;
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ username: string; display_name: string }>(
    'SELECT username, display_name FROM app_user WHERE username = ANY($1)',
    [아이디들],
  );
  const 이름표 = new Map(r.rows.map((줄) => [줄.username, 줄.display_name]));
  return 입력들.map((입력) => (입력 === null ? null : { ...입력, by: 이름표.get(입력.by) ?? 입력.by }));
}
