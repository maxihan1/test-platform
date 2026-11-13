import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 지급내용만들기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 새지급, 지급읽기, 지급회수, 캐릭터번호 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-480',
  name: '회수한 지급을 API 로 다시 회수하면 「이미 회수한 지급 건입니다」가 온다',
  techniques: ['동등 분할'],
  precondition: ['회수한 지급이 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-480');
  const 글 = 고유글('ARO-FN-480');
  let 번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('지급을 보내고 회수해 둔다', async () => {
      번호 = await 새지급(page, 지급내용만들기(await 캐릭터번호(page, 'qa_player2'), 글, 글));
      await 지급회수(page, 번호, 글);
      await verify('회수한 지급이 있다', (await 지급읽기(page, 번호)).recalledAt !== null, true, { blocker: true });
    });

    await test.step('API 로 그 지급을 다시 회수한다', async () => {
      const 응답 = await 지급회수(page, 번호, 글);
      await verify('회수한 지급을 API 로 다시 회수하면 「이미 회수한 지급 건입니다」가 온다', String(응답.body.message), '이미 회수한 지급 건입니다');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
