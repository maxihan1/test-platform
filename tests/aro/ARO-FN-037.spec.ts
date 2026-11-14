import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-037',
  name: '골드 1000 을 지급하면 지급 이력 「내용」에 「1,000」이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-037');
  const 제목 = 고유글('ARO-FN-037');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('API 로 qa_player2 에게 골드 1000 을 지급한 뒤 「지급 · 회수」를 연다', async () => {
      await 새지급(page, 지급내용만들기(await 캐릭터번호(page, 'qa_player2'), 제목, 제목, { items: [], currencyAmount: 1000 }));
      await 화면.열기();
      await 화면.행(제목).waitFor();
      const 내용 = await 화면.열칸(제목, '내용');
      await verify('골드 1000 을 지급하면 지급 이력 「내용」에 「1,000」이 보인다', (await 내용.innerText()).includes('1,000'), true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
