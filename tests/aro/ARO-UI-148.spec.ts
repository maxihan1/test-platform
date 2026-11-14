import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-148',
  name: '지급 이력 표에 열 「번호」 · 「보낸 시각」 · 「제목」 · 「내용」 · 「받는 캐릭터」 · 「사유」 · 「처리」가 보인다',
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

  await test.step('지급 이력 표 머리를 본다', async () => {
    await 화면.열기();
    await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    await 화면.열머리들.first().waitFor();
    const 머리들 = (await 화면.열머리들.allInnerTexts()).filter((글) => 글.trim() !== '');
    await verify('지급 이력 표에 열 「번호」 · 「보낸 시각」 · 「제목」 · 「내용」 · 「받는 캐릭터」 · 「사유」 · 「처리」가 보인다', 머리들.join(', '), '번호, 보낸 시각, 제목, 내용, 받는 캐릭터, 사유, 처리');
  });
});
