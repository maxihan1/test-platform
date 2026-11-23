import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 로그인화면준비, 설정창닫기 } from './helpers/login-tools.helper.js';
import { 설정창 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-647',
  name: '로그인 화면에서 설정 창을 열면 소리 막대 「Overall Volume」 · 「Music Volume」 둘이 보인다',
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
  await test.step('오른쪽 위 톱니바퀴를 눌러 설정 창을 연다', async () => {
    const 창 = await 설정창.열기(game);
    const 전체 = await verify('첫 소리 막대 이름이 「Overall Volume」이다', await 창.전체소리막대이름(), 'Overall Volume');
    const 음악 = await verify('둘째 소리 막대 이름이 「Music Volume」이다', await 창.음악소리막대이름(), 'Music Volume');
    await verify('로그인 화면에서 설정 창을 열면 소리 막대 「Overall Volume」 · 「Music Volume」 둘이 보인다', 전체 && 음악, true);
  });
});
