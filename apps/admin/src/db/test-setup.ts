// DB 검사 파일이 끝날 때 그 파일의 연결 풀을 닫는다 (vitest.config.ts 의 db 묶음 setupFiles)
// 검사 파일마다 모듈을 새로 읽어 풀이 새로 생긴다. 안 닫으면 쉬는 연결이 10초씩 남아 쌓이고
// 개발 postgres 상한(100)을 넘어 남의 파일이 「too many clients」로 깨진다(2026-10-10 실측 — DB 묶음만으로 88개).
// setupFiles 의 afterAll 은 먼저 걸려 가장 나중에 돈다 — 검사 파일의 치우기가 끝난 뒤 닫는다

import { afterAll } from 'vitest';

afterAll(async () => {
  if (process.env.DATABASE_URL === undefined) return;
  const { pool } = await import('./index.js');
  // 스스로 닫는 검사 파일이 있다(reporting/*.test.ts 등). 두 번 닫으면 pg 가 던진다
  if (!pool.ending && !pool.ended) await pool.end();
});
