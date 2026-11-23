import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 로그인화면준비, 설정창닫기 } from './helpers/login-tools.helper.js';
import { 설정창 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'BRM-UI-485',
  name: '설정 창에서 「Close Button」을 누르면 설정 창이 닫힌다',
  platforms: ['android'],
  precondition: ['로그인 화면에서 설정 창을 열었다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver }) => {
  await test.cleanup('열린 설정 창 닫기', () => 설정창닫기(game));
  await test.step('로그인 화면에서 설정 창을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await 설정창.열기(game);
  });
  await test.step('설정 창에서 「Close Button」을 누른다', async () => {
    const 창 = await 설정창.열기(game);
    await 창.닫기누르기();
    await verify('설정 창에서 「Close Button」을 누르면 설정 창이 닫힌다', await 창.닫힐때까지(), true);
  });
});
