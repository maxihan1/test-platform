import { defineCase, test, verify } from '@platform/kit';

import { 색뗀글 } from './components/hud.component.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { 봇모두끄기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 그림색, 빨강인가 } from './helpers/login-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-422',
  name: '점검이 걸리면 공지 띠에 빨간 바탕으로 「[점검] 」 글이 보인다',
  platforms: ['android'],
  precondition: ['점검이 켜져 있다'],
  elements: ['state:점검=켜짐'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  await test.cleanup('켜 둔 봇 끄기 · 점검 끄기', async () => {
    await 봇모두끄기(admin);
    await 점검끄기(admin);
  });
  await test.step('점검을 켜고 로그인 화면을 연다', async () => {
    await 점검켜기(admin, { 안내: '[QA] 422 점검' });
    if ((await 지금화면(game)) !== '로그인') await 게임다시켜기(game, driver);
    await 로그인화면.열기(game);
    const 뜸 = await game.waitFor(로그인화면.공지띠, { text: '점검', timeoutMs: 75_000 }).then(() => true, () => false);
    await verify('로그인 화면 공지 띠에 점검 글이 보인다', 뜸, true, { blocker: true });
  });
  await test.step('로그인 화면 공지 띠를 본다', async () => {
    const 글 = 색뗀글((await new 로그인화면(game).공지띠글()) ?? '');
    const 머리 = await verify('공지 띠 글이 「[점검] 」으로 시작한다', 글.startsWith('[점검] '), true);
    const 바탕 = await verify('공지 띠 바탕이 빨강이다', 빨강인가(await 그림색(game, 로그인화면.공지띠바탕)), true);
    await verify('점검이 걸리면 공지 띠에 빨간 바탕으로 「[점검] 」 글이 보인다', 머리 && 바탕, true);
  });
});
