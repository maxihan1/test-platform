import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기, 없는번호들 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 캐릭터번호 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-408',
  name: 'qa_player2 와 없는 번호를 섞어 지급하면 404 와 「없는 캐릭터가 섞여 있습니다」가 온다',
  techniques: ['동등 분할'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 접두 = 고유접두('ARO-FN-408');
  const 제목 = 고유글('ARO-FN-408');
  let 캐릭터 = 0;

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
      캐릭터 = await 캐릭터번호(page, 'qa_player2');
    });

    await test.step('API 로 qa_player2 와 없는 캐릭터 번호를 섞어 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [캐릭터, ...없는번호들(1)], 제목);
      const 코드 = await verify('응답 코드가 404 이다', 응답.status, 404);
      const 글 = await verify('응답 메시지가 「없는 캐릭터가 섞여 있습니다」이다', String(응답.body.message), '없는 캐릭터가 섞여 있습니다');
      await verify('qa_player2 와 없는 번호를 섞어 지급하면 404 와 「없는 캐릭터가 섞여 있습니다」가 온다', 코드 && 글, true);
    });

  } finally {
    await 내것지급치우기(page, 접두);
  }
});
