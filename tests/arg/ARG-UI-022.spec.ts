import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 가운데에있는지 } from './helpers/place.helper.js';
import { 안내창 } from './components/popup.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-022',
  name: '접속 안내 창이 화면 가운데에 보이고 버튼은 「확인」 하나다',
  platforms: ['android'],
  precondition: ['없는 아이디로 로그인에 실패해 접속 안내 창이 떠 있다'],
  params: z.object({
    없는아이디: z.string().describe('없는 아이디 — 가입되지 않은 아이디').default('qa_nouser_zz9'),
    틀린비밀번호: z.string().describe('틀린 비밀번호 — 아무 글자').default('qa_nopw_zz9'),
  }),
  expected: z.object({
    버튼글: z.string().describe('접속 안내 창의 버튼 글').default('확인'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('없는 아이디로 「게임 시작」을 눌러 접속 안내 창을 띄운다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
    await verify('접속 안내 창이 보인다', await 화면.안내창.뜨는지('로그인 실패'), true, { blocker: true });
  });

  await test.step('접속 안내 창을 확인한다', async () => {
    const 화면 = 로그인화면.지금(game);
    const 가운데 = await 가운데에있는지(game, 안내창.창);
    const 버튼 = (await 화면.안내창.확인있는지()) && (await 화면.안내창확인글()) === expected.버튼글;
    await verify('접속 안내 창이 화면 가운데에 보이고 버튼은 「확인」 하나다', 가운데 && 버튼, true);
  });
});
