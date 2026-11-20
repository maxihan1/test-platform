import { defineCase, test, verify } from '@platform/kit';

import { 색뗀글 } from './components/hud.component.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-410',
  name: '로그인하지 않은 로그인 화면에서 공지 띠를 보면 로그인 전에도 로그인 화면 공지 띠에 [QA] 공지가 보인다',
  platforms: ['android'],
  precondition: ['[QA] 공지가 켜져 있다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  const 제목 = '[QA] 공지 410';
  let 화면: 로그인화면 | null = null;
  await test.step('공지를 켜고 로그인 화면을 연다', async () => {
    await 공지만들기(admin, 제목, '로그인 전 공지 띠 시험');
    await 게임다시켜기(game, driver);
    화면 = await 로그인화면.열기(game);
    await verify('로그인하지 않은 로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('로그인하지 않은 로그인 화면에서 공지 띠를 본다', async () => {
    const 뜸 = (await 화면?.공지띠뜸(30_000)) ?? false;
    const 글 = 색뗀글((await 화면?.공지띠글()) ?? '');
    const 보임 = await verify('로그인 화면 공지 띠가 보인다', 뜸, true);
    const 담김 = await verify('공지 띠 글에 [QA] 공지 제목이 들어 있다', 글.includes(제목), true);
    await verify('로그인하지 않은 로그인 화면에서 공지 띠를 보면 로그인 전에도 로그인 화면 공지 띠에 [QA] 공지가 보인다', 보임 && 담김, true);
  });
});
