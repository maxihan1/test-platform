// 첫 서비스를 컨테이너 안에서 만드는 명령 (SPEC §9.2).
// 설정 화면(§8.8)은 로그인해야 열리고, 서비스가 하나도 없으면 그 안에서 아무것도 못 한다.
// 두 번째부터는 설정 화면이 같은 일을 하고 거기서는 색·저장소·대상 서버까지 한자리에서 넣는다

import { pool } from '../apps/admin/src/db/index.js';
// 접두사 모양은 설정 API 가 쓰는 것을 그대로 가져온다. 같은 모양을 두 번 적으면 한쪽만 고치는 날이 온다
import { 접두사모양 } from '../apps/admin/src/settings/routes.js';
import { 서비스만들기, 설정오류 } from '../apps/admin/src/settings/store.js';
// 기본색은 설정 화면과 같은 값을 쓴다. 두 곳에 적으면 한쪽만 고치는 날이 온다 (CLAUDE.md §2.7 ⑤)
import { 안쓰는서비스색 } from '../apps/admin/src/web/settingsView.js';

const 인자 = process.argv.slice(2);

// --env <키>=<주소> 를 여러 번 받는다. 나머지는 자리 인자다
const envs: { env: string; baseUrl: string }[] = [];
const 자리인자: string[] = [];

for (let i = 0; i < 인자.length; i += 1) {
  if (인자[i] !== '--env') {
    자리인자.push(인자[i]!);
    continue;
  }
  const 짝 = 인자[i + 1];
  if (짝 === undefined) {
    console.error('--env 뒤에 <키>=<주소>가 없다. 예: --env qa=https://qa.example.com');
    process.exit(1);
  }
  const 가른자리 = 짝.indexOf('=');
  if (가른자리 <= 0 || 가른자리 === 짝.length - 1) {
    console.error(`--env "${짝}"의 모양이 다르다. <키>=<주소>로 적는다. 예: qa=https://qa.example.com`);
    process.exit(1);
  }
  envs.push({ env: 짝.slice(0, 가른자리), baseUrl: 짝.slice(가른자리 + 1) });
  i += 1;
}

const [prefix, name] = 자리인자;

if (prefix === undefined || name === undefined) {
  console.error('쓰는 법: npx tsx scripts/add-service.ts <접두사> <이름> [--env <키>=<주소>]...');
  process.exit(1);
}

if (!접두사모양.test(prefix)) {
  console.error(`접두사 "${prefix}"의 모양이 다르다. 대문자로 시작하는 영문·숫자 12자 이내다 (SPEC §2)`);
  process.exit(1);
}

try {
  // 색·저장소 주소는 설정 화면에서 채운다. 실행에 없어도 되는 값이다.
  //
  // **대상 서버는 다르다** (2026-09-19). 하나도 없으면 실행 설정의 드롭다운이 비고,
  // 안 고르면 POST /api/runs 가 400 을 낸다 — 즉 서비스를 만들어도 아무것도 못 돌린다.
  // 설정 화면(§8.8)이 생기기 전까지 여기가 유일한 입구다 (SPEC §9.2 와 같은 성질)
  const id = await 서비스만들기({
    prefix,
    name,
    color: 안쓰는서비스색,
    testsRepo: '',
    // 플랫폼이 실제로 훑을 폴더. PLATFORM_TESTS_DIR 아래 상대경로다 (SPEC §6)
    testsDir: prefix.toLowerCase(),
    envs,
  });
  console.log(`서비스를 만들었다. 번호 ${String(id)} · 접두사 ${prefix} · 이름 ${name}`);
  console.log(`테스트 폴더는 "${prefix.toLowerCase()}"로 뒀다. 다르면 설정 화면에서 고친다`);
  if (envs.length === 0) {
    console.log('');
    console.log('⚠️  대상 서버를 하나도 안 넣었다. 이대로면 실행 설정에서 고를 것이 없어 실행을 못 한다.');
    console.log('    --env qa=https://qa.example.com 처럼 하나 이상 넣는다 (SPEC §8.2)');
  } else {
    console.log(`대상 서버 ${String(envs.length)}개 — ${envs.map((e) => e.env).join(' · ')}`);
  }
  console.log('색 · 테스트 저장소는 설정 화면에서 채운다 (§8.8)');
  console.log('접두사는 지금 정한 것이 끝이다 — tcId 안에 박혀 있어 나중에 바꿀 수 없다');
} catch (err) {
  console.error(err instanceof 설정오류 && err.code === 'PREFIX_TAKEN' ? `접두사 ${prefix}는 이미 쓰였다` : err);
  process.exit(1);
} finally {
  await pool.end();
}
