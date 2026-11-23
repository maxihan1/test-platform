import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 로그인화면준비, 설정창닫기 } from './helpers/login-tools.helper.js';
import { 설정창 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-646',
  name: '로그인 화면에서 설정 창을 열면 제목에 「Settings」가 보인다',
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
    await verify('로그인 화면에서 설정 창을 열면 제목에 「Settings」가 보인다', await 창.제목(), 'Settings');
    const 배치 = await game.layout(설정창.판);
    await verify('설정 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
});
