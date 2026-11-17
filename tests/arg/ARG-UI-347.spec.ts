import { defineCase, test, verify } from '@platform/kit';

import { 게임다시켜기 } from './helpers/connect.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-347',
  name: '로그인 화면에서 톱니바퀴를 누르면 설정 창이 열린다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver }) => {
  let 화면 = 로그인화면.지금(game);
  await test.step('로그인 화면을 기다린다', async () => {
    화면 = await 로그인화면.열기(game);
  });
  await test.step('로그인 화면을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
  });

  await test.step('로그인 화면에서 톱니바퀴를 누른다', async () => {
    await game.click(로그인화면.톱니바퀴);
    const 열림 = await game.waitFor(로그인화면.설정창, { timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('로그인 화면에서 톱니바퀴를 누르면 설정 창이 열린다', 열림, true);
  });

  await test.step('게임을 다시 켜 로그인 화면을 기다린다', async () => {
    화면 = await 게임다시켜기(driver, game);
  });
  await test.step('로그인 화면에서 「X」를 누른다', async () => {
    await game.click(로그인화면.닫기X);
    const 뜸 = await game.waitFor(로그인화면.나가기창, { timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    const 창 = await verify('「Exit Game?」 창이 뜬다', 뜸, true);
    const 글 = await verify('창에 「Exit Game?」 문구가 보인다', (await 화면.글(로그인화면.나가기글)).includes('Exit Game?'), true);
    await verify('로그인 화면에서 「X」를 누르면 「Exit Game?」 창이 뜬다', 창 && 글, true);
  });
});
