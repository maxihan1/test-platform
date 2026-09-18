// 첫 서비스를 컨테이너 안에서 만드는 명령 (SPEC §9.2).
// 설정 화면(§8.8)은 로그인해야 열리고, 서비스가 하나도 없으면 그 안에서 아무것도 못 한다.
// 두 번째부터는 설정 화면이 같은 일을 하고 거기서는 색·저장소·대상 서버까지 한자리에서 넣는다

import { pool } from '../apps/admin/src/db/index.js';
// 접두사 모양은 설정 API 가 쓰는 것을 그대로 가져온다. 같은 모양을 두 번 적으면 한쪽만 고치는 날이 온다
import { 접두사모양 } from '../apps/admin/src/settings/routes.js';
import { 서비스만들기, 설정오류 } from '../apps/admin/src/settings/store.js';

const [prefix, name] = process.argv.slice(2);

if (prefix === undefined || name === undefined) {
  console.error('쓰는 법: npx tsx scripts/add-service.ts <접두사> <이름>');
  process.exit(1);
}

if (!접두사모양.test(prefix)) {
  console.error(`접두사 "${prefix}"의 모양이 다르다. 대문자로 시작하는 영문·숫자 12자 이내다 (SPEC §2)`);
  process.exit(1);
}

try {
  // 색·저장소 주소·대상 서버는 설정 화면에서 채운다. 여기서 받으면 인자가 여섯이 된다
  const id = await 서비스만들기({
    prefix,
    name,
    color: '#5B7FDE',
    testsRepo: '',
    // 플랫폼이 실제로 훑을 폴더. PLATFORM_TESTS_DIR 아래 상대경로다 (SPEC §6)
    testsDir: prefix.toLowerCase(),
    envs: [],
  });
  console.log(`서비스를 만들었다. 번호 ${String(id)} · 접두사 ${prefix} · 이름 ${name}`);
  console.log(`테스트 폴더는 "${prefix.toLowerCase()}"로 뒀다. 다르면 설정 화면에서 고친다`);
  console.log('색 · 테스트 저장소 · 대상 서버 주소는 설정 화면에서 채운다 (§8.8)');
  console.log('접두사는 지금 정한 것이 끝이다 — tcId 안에 박혀 있어 나중에 바꿀 수 없다');
} catch (err) {
  console.error(err instanceof 설정오류 && err.code === 'PREFIX_TAKEN' ? `접두사 ${prefix}는 이미 쓰였다` : err);
  process.exit(1);
} finally {
  await pool.end();
}
