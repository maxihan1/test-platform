import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급회수, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-451',
  name: '지급하면 이력 「처리」에 보낸 운영자 「qa_ops」가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-451');
  const 글 = 고유글('ARO-FN-451');
  let 번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('API 로 지급한 뒤 지급 이력 「처리」를 본다', async () => {
      번호 = await 새지급(page, 지급내용만들기(await 캐릭터번호(page, 'qa_player2'), 글, 글));
      await 화면.열기();
      await 화면.행(글).waitFor();
      await verify('지급하면 이력 「처리」에 보낸 운영자 「qa_ops」가 보인다', (await (await 화면.열칸(글, '처리')).innerText()).trim(), 'qa_ops');
    });

    await test.step('그 지급을 회수한 뒤 「처리」를 본다', async () => {
      await 지급회수(page, 번호, 글);
      await 화면.열기();
      await 화면.행(글).waitFor();
      const 처리 = await (await 화면.열칸(글, '처리')).innerText();
      await verify('회수한 지급은 「처리」 아래에 「회수 <일시> · qa_ops」가 붙는다', /(^|\n)회수 \d{4}-\d{2}-\d{2} \d{2}:\d{2} · qa_ops$/.test(처리.trim()), true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
