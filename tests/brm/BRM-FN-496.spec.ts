import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면준비 } from './helpers/login-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-496',
  name: '로그인 화면에 들어오면 로그인 창 제목이 「로그인」이다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 화면 = await 로그인화면준비(game, driver);
  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('로그인 창 제목을 읽는다', async () => {
    await verify('로그인 화면에 들어오면 로그인 창 제목이 「로그인」이다', await 화면.제목(), '로그인');
  });
  await test.step('로그인 화면의 배치를 확인한다', async () => {
    const 배치 = await game.layout(로그인화면.판);
    await verify('로그인 화면의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
});
