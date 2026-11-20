import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면준비, 설정창닫기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-UI-474',
  name: '로그인 화면에서 「톱니바퀴」를 누르면 설정 창이 뜬다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver }) => {
  await test.cleanup('열린 설정 창 닫기', () => 설정창닫기(game));
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('오른쪽 위 톱니바퀴 버튼을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.설정누르기();
    await verify('로그인 화면에서 「톱니바퀴」를 누르면 설정 창이 뜬다', await 화면.설정창뜸(), true);
  });
});
