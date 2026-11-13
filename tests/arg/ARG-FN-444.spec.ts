import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-444',
  name: '없는 아이디로 접속에 실패하면 「게임 시작」을 다시 누를 수 있고 상태 줄 글이 비어 있다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    없는아이디: z.string().describe('없는 아이디 — 가입되지 않은 아이디').default('qa_nouser_zz9'),
    틀린비밀번호: z.string().describe('틀린 비밀번호 — 아무 글자').default('qa_nopw_zz9'),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('없는 아이디로 「게임 시작」을 누르고 실패 창의 「확인」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.없는아이디, params.틀린비밀번호);
    await 화면.안내창.뜨는지('로그인 실패');
    await 화면.안내창.확인누르기();
  });

  await test.step('로그인 화면을 확인한다', async () => {
    const 화면 = 로그인화면.지금(game);
    const 눌린다 = await 화면.게임시작이눌릴때까지();
    await verify('없는 아이디로 접속에 실패하면 「게임 시작」을 다시 누를 수 있고 상태 줄 글이 비어 있다', 눌린다 && (await 화면.상태글()).trim() === '', true);
  });
});
