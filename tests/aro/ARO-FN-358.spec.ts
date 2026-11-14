import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-358',
  name: '받는 캐릭터 칸에 「zz없는캐릭터zz」를 적으면 「찾는 캐릭터가 없습니다」가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
  });

  await test.step('「지급 · 회수」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
  });

  await test.step('받는 캐릭터 칸에 「zz없는캐릭터zz」를 적는다', async () => {
    await 화면.검색어적기('zz없는캐릭터zz');
    await 화면.후보상자.waitFor();
    await verify('받는 캐릭터 칸에 「zz없는캐릭터zz」를 적으면 「찾는 캐릭터가 없습니다」가 보인다', await 화면.후보없음.isVisible(), true);
  });
});
