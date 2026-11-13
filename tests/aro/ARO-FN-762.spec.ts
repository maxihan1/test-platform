import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 캐릭터51명모킹걸기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-762',
  name: '후보 50명을 고르면 고른 캐릭터가 50명 보인다',
  techniques: ['경계값 분석'],
  precondition: ['캐릭터 찾기 응답은 캐릭터 51명을 주는 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  let 모킹풀기 = async (): Promise<void> => {};

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      모킹풀기 = await 캐릭터51명모킹걸기(page);
      await 화면.열기();
      await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
      await 화면.검색어적기('zz');
      await 화면.후보뜰때까지();
      await verify('캐릭터 찾기 응답은 캐릭터 51명을 주는 가짜 응답(모킹)이다', await 화면.후보들.count(), 51, { blocker: true });
    });

    await test.step('후보를 50명까지 누른다', async () => {
      await 화면.후보를번째까지누르기(50);
      await verify('후보 50명을 고르면 고른 캐릭터가 50명 보인다', await 화면.고른것들.count(), 50);
    });

    await test.step('51번째 후보를 누른다', async () => {
      await 화면.후보번째누르기(50);
      const 떴다 = await 화면.알림.뜰때까지('받는 캐릭터는 50명까지입니다');
      await verify('51번째 후보에서는 토스트 「받는 캐릭터는 50명까지입니다」가 뜬다', 떴다, true);
    });
  } finally {
    await 모킹풀기();
  }
});
