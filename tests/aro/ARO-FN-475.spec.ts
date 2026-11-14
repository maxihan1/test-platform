import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-475',
  name: '회수를 실행하면 그 지급 줄의 「회수」 버튼이 사라진다',
  precondition: ['qa_player2 에게 보낸 안 받은 지급이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-475');
  const 글 = 고유글('ARO-FN-475');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('「지급 · 회수」 화면에서 보낸 지급 줄을 확인한다', async () => {
      await 새지급(page, 지급내용만들기(await 캐릭터번호(page, 'qa_player2'), 글, 글));
      await 화면.열기();
      await 화면.행(글).waitFor();
      await verify('qa_player2 에게 보낸 안 받은 지급이 있다', await 화면.회수버튼(글).isVisible(), true, { blocker: true });
    });

    await test.step('그 지급을 회수하고 지급 줄을 본다', async () => {
      await 화면.회수하기(글, 글);
      await 화면.칩(글).filter({ hasText: /^회수$/ }).waitFor();
      await verify('회수를 실행하면 그 지급 줄의 「회수」 버튼이 사라진다', await 화면.회수버튼(글).count(), 0);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
