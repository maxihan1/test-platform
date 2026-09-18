// 첫 계정을 컨테이너 안에서 만드는 명령 (SPEC §9.2). 회원가입 화면은 없고 (§8.6)
// 두 번째부터는 설정 화면이 같은 일을 한다 (§8.8).
// 비밀번호는 인자로 받지 않는다 — 명령에 적으면 서버의 명령 이력에 평문으로 남는다

import { pool } from '../apps/admin/src/db/index.js';
import { 계정만들기, 설정오류 } from '../apps/admin/src/settings/store.js';

const [username, displayName, role] = process.argv.slice(2);

if (username === undefined || displayName === undefined || role === undefined) {
  console.error('쓰는 법: npx tsx scripts/add-user.ts <아이디> <이름> <등급>');
  console.error('등급은 viewer(보기만) · operator(실행까지) · admin(운영) 중 하나다');
  process.exit(1);
}

if (role !== 'viewer' && role !== 'operator' && role !== 'admin') {
  console.error(`등급 "${role}"은 없다. viewer · operator · admin 중 하나여야 한다 (SPEC §3.5)`);
  process.exit(1);
}

const 있는계정 = await pool.query<{ count: string }>('SELECT count(*) FROM app_user');
if (Number(있는계정.rows[0]?.count ?? 0) === 0 && role !== 'admin') {
  // 첫 계정이 운영이 아니면 설정 화면에 아무도 못 들어가고 이 명령을 또 쳐야 한다 (SPEC §9.2)
  console.error('첫 계정은 운영(admin) 등급이어야 한다. 그래야 설정 화면에서 나머지를 만들 수 있다');
  process.exit(1);
}

try {
  const 임시비밀번호 = await 계정만들기({ username, displayName, role, services: [] });
  console.log(`계정을 만들었다. 아이디 ${username} · 이름 ${displayName} · 등급 ${role}`);
  console.log(`비밀번호: ${임시비밀번호}`);
  console.log('이 줄이 비밀번호를 볼 수 있는 유일한 자리다. 잊으면 설정 화면에서 다시 만든다');
  console.log('배정할 서비스는 설정 화면에서 고른다 — 배정받지 않은 서비스는 띠에 뜨지 않는다');
} catch (err) {
  console.error(err instanceof 설정오류 && err.code === 'USERNAME_TAKEN' ? `아이디 ${username}은 이미 있다` : err);
  process.exit(1);
} finally {
  await pool.end();
}
