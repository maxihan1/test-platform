import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-001',
  name: '로그인 화면에 아이디 칸 · 비밀번호 칸 · 「게임 시작」만 보이고 회원 가입 버튼은 보이지 않는다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('로그인 화면을 확인한다', async () => {
    const 화면 = 로그인화면.지금(game);
    const 칸들 = (await 있는지(game, 로그인화면.아이디칸)) && (await 있는지(game, 로그인화면.비밀번호칸)) && (await 있는지(game, 로그인화면.게임시작));
    const 가입 = await 화면.글자있는지('가입');
    await verify('로그인 화면에 아이디 칸 · 비밀번호 칸 · 「게임 시작」만 보이고 회원 가입 버튼은 보이지 않는다', 칸들 && !가입, true);
  });
});
