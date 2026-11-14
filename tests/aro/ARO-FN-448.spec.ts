import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-448',
  name: '지급하면 이력의 「받는 캐릭터」에 「qa_player2」와 「안 받음」 칩이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-448');
  const 글 = 고유글('ARO-FN-448');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('API 로 qa_player2 에게 지급한 뒤 지급 이력을 본다', async () => {
      await 새지급(page, 지급내용만들기(await 캐릭터번호(page, 'qa_player2'), 글, 글));
      await 화면.열기();
      await 화면.행(글).waitFor();
      const 칸 = await 화면.열칸(글, '받는 캐릭터');
      const 이름 = await verify('이력의 「받는 캐릭터」에 「qa_player2」가 보인다', (await 칸.innerText()).includes('qa_player2'), true);
      const 칩 = await verify('이력의 「받는 캐릭터」에 「안 받음」 칩이 보인다', (await 화면.칩(글).allInnerTexts()).join(', '), '안 받음');
      await verify('지급하면 이력의 「받는 캐릭터」에 「qa_player2」와 「안 받음」 칩이 보인다', 이름 && 칩, true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
