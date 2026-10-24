import { defineCase, test, verify } from '@platform/kit';

import { 새비밀번호, 새아이디 } from './helpers/api.helper.js';
import { 대상서버, 서버맞추기 } from './helpers/game-enter.helper.js';
import { 글이뜰때까지 } from './helpers/world.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-345',
  name: '없는 아이디로 로그인하면 상태 글에 오류 코드가 아닌 한국어 안내가 보인다',
  platforms: ['android'],
  precondition: ['게임 로그인 화면이 떠 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('게임 로그인 화면을 연다', async () => {
    await 서버맞추기(game);
  });
  await test.step('게임 로그인 화면이 떠 있는지 확인한다', async () => {
    const 화면 = new 로그인화면(game);
    await verify('게임 로그인 화면이 떠 있다', (await 화면.서버글()).includes(대상서버()), true, { blocker: true });
  });
  await test.step('없는 아이디로 로그인한다', async () => {
    const 화면 = new 로그인화면(game);
    await 화면.아이디적기(새아이디('qafn345'));
    await 화면.비밀번호적기(새비밀번호());
    await 화면.로그인누르기();
    const 글 = await 글이뜰때까지(game, `${로그인화면.창}/Form/StatusText`);
    const 코드아님 = await verify('상태 글이 오류 코드가 아니다', /^[A-Z][A-Z_]+$/.test(글), false);
    const 한국어 = await verify('상태 글에 한국어가 있다', /[가-힣]/.test(글), true);
    await verify('없는 아이디로 로그인하면 상태 글에 오류 코드가 아닌 한국어 안내가 보인다', 코드아님 && 한국어, true);
  });
});
