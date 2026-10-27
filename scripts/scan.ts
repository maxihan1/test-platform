// 케이스 목록을 지금 한 번 다시 훑는다 — 서버가 main 을 받아 온 뒤 pull timer 가 부른다 (SPEC 공통/6-인프라 §9.2 「서버와 맥에 나눠 띄우기」).
// 맥이 병합하면 admin 이 곧바로 훑지만 그때 서버 폴더는 아직 옛 파일이다. 「다시 스캔」과 같은 일을 컨테이너 안에서 한다 — HTTP 문을 새로 열지 않는다
//   docker compose exec -T admin node --import tsx scripts/scan.ts

import { runScan } from '../apps/admin/src/catalog/scanRun.js';
import { pool } from '../apps/admin/src/db/index.js';

try {
  // 서비스 하나의 문제(읽지 못한 파일 · 겹친 번호)는 스캔이 경고 줄로 남기고 넘어간다. 통째로 깨졌을 때만 실패로 끝내 timer 가 다음에 다시 훑게 한다
  const 기록 = await runScan(console);
  if (기록.깨짐 === undefined) console.log('[scan] 다시 훑었다');
  else process.exitCode = 1;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
