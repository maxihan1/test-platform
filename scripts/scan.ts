// 케이스 목록을 지금 한 번 다시 훑는다 — 서버가 main 을 받아 온 뒤 pull timer 가 부른다 (SPEC 공통/6-인프라 §9.2 「서버와 맥에 나눠 띄우기」).
// 맥이 병합하면 admin 이 곧바로 훑지만 그때 서버 폴더는 아직 옛 파일이다. 「다시 스캔」과 같은 일을 컨테이너 안에서 한다 — HTTP 문을 새로 열지 않는다
//   docker compose exec -T admin node --import tsx scripts/scan.ts

import { 훑고보기 } from '../apps/admin/src/catalog/scanRun.js';
import { pool } from '../apps/admin/src/db/index.js';

try {
  // 부른 사람이 없어 결과는 안 돌려준다 — 훑어 DB 에 적기만 하고 문제는 스캔이 경고 줄로 남긴다
  await 훑고보기(console, null);
  console.log('[scan] 다시 훑었다');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
