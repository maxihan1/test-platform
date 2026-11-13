import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-022',
  name: '머리줄에 로고 「Boss Room」 · 「게임 운영」 · 운영자 이름 · 「로그아웃」 버튼이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('대시보드를 연다', async () => {
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    const 로고 = await verify('머리줄에 로고 「Boss Room」이 보인다', await 대시보드.틀.로고.isVisible(), true);
    const 게임운영 = await verify('머리줄에 「게임 운영」이 보인다', await 대시보드.틀.게임운영.isVisible(), true);
    const 운영자 = await verify('머리줄에 운영자 이름이 보인다', await 대시보드.틀.운영자.isVisible(), true);
    const 로그아웃 = await verify('머리줄에 「로그아웃」 버튼이 보인다', await 대시보드.틀.로그아웃.isVisible(), true);
    await verify('머리줄에 로고 「Boss Room」 · 「게임 운영」 · 운영자 이름 · 「로그아웃」 버튼이 보인다', 로고 && 게임운영 && 운영자 && 로그아웃, true);
  });
});
