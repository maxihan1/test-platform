import { defineCase, test, verify } from '@platform/kit';

import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 그림색, 반투명검정인가 } from './helpers/login-tools.helper.js';
import { 글자색, 금색인가 } from './helpers/social-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-415',
  name: '공지 띠의 「[공지]」 글자색과 바탕색을 읽으면 공지 띠의 「[공지]」는 금색이고 바탕은 반투명 검정이다',
  platforms: ['android'],
  precondition: ['[QA] 공지가 켜져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  await test.cleanup('켜 둔 봇 끄기 · [QA] 공지 지우기', async () => {
    await 봇모두끄기(admin);
    await QA공지모두지우기(admin);
  });
  await test.step('[QA] 공지를 켜고 로그인 화면 공지 띠에 뜨기를 기다린다', async () => {
    await QA공지모두지우기(admin);
    await 공지만들기(admin, '[QA] 415 공지', '색 확인');
    if ((await 지금화면(game)) !== '로그인') await 게임다시켜기(game, driver);
    await 로그인화면.열기(game);
    const 뜸 = await game.waitFor(로그인화면.공지띠, { text: '415 공지', timeoutMs: 75_000 }).then(() => true, () => false);
    await verify('로그인 화면 공지 띠에 [QA] 공지가 보인다', 뜸, true, { blocker: true });
  });
  await test.step('공지 띠의 「[공지]」 글자색과 바탕색을 읽는다', async () => {
    const 화면 = new 로그인화면(game);
    const 원문 = (await 화면.공지띠글()) ?? '';
    const 금색 = await verify('「[공지]」 글자색이 금색이다', 금색인가(글자색(원문)), true);
    const 바탕 = await verify('공지 띠 바탕이 반투명 검정이다', 반투명검정인가(await 그림색(game, 로그인화면.공지띠바탕)), true);
    await verify('공지 띠의 「[공지]」 글자색과 바탕색을 읽으면 공지 띠의 「[공지]」는 금색이고 바탕은 반투명 검정이다', 금색 && 바탕, true);
  });
});
