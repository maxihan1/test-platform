// 케이스 목록을 지금 한 번 다시 훑는다 — 서버가 저장소를 받아 온 뒤 pull timer 가 부른다 (SPEC 공통/6-인프라 「테스트 코드 저장소」 「받아 오기」).
// 맥이 병합하면 admin 이 Commander 자리만 곧바로 훑는다. 다른 저장소는 서버가 받은 뒤 여기서 훑는다. 「다시 스캔」과 같은 일을 컨테이너 안에서 한다 — HTTP 문을 새로 열지 않는다
//   docker compose exec -T admin node --import tsx scripts/scan.ts                       전부 훑는다
//   docker compose exec -T admin node --import tsx scripts/scan.ts maxihan1/demo-market   그 저장소를 쓰는 서비스만 훑는다
//   docker compose exec -T admin node --import tsx scripts/scan.ts --repos               받아 올 저장소 자리(<소유자>/<이름>)를 한 줄씩 찍는다

import { runScan } from '../apps/admin/src/catalog/scanRun.js';
import { activeServices } from '../apps/admin/src/catalog/store.js';
import { pool } from '../apps/admin/src/db/index.js';
import { 저장소자리 } from '../apps/admin/src/settings/testsRepo.js';

/** 살아 있는 서비스의 저장소 자리. 꼴이 틀리거나 빈 칸은 받을 곳이 없어 뺀다 — 그 서비스는 스캔이 문제 줄로 알린다 */
function 받을자리들(서비스들: readonly { testsRepo: string }[]): string[] {
  return [...new Set(서비스들.flatMap((s) => 저장소자리(s.testsRepo) ?? []))].sort();
}

try {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--repos')) {
    for (const 자리 of 받을자리들(await activeServices())) console.log(자리);
  } else {
    const 고른자리 = new Set(인자);
    // 서비스 하나의 문제(읽지 못한 파일 · 겹친 번호)는 스캔이 경고 줄로 남기고 넘어간다. 통째로 깨졌을 때만 실패로 끝내 timer 가 다음에 다시 훑게 한다
    const 기록 = await runScan(console, 고른자리.size === 0 ? undefined : (s) => 고른자리.has(저장소자리(s.testsRepo) ?? ''));
    if (기록.깨짐 === undefined) console.log(`[scan] 다시 훑었다${고른자리.size === 0 ? '' : ` — ${[...고른자리].join(' · ')}`}`);
    else process.exitCode = 1;
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
