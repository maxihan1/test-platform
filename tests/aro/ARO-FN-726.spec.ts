import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 계정번호, 적용중제재풀기, 제재걸기 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-726',
  name: 'API 로 사유 없는 제재를 보내면 응답이 400 이고 본문이 code 「INVALID」와 message 를 담는다',
  techniques: ['동등 분할'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 qa_player2 의 계정 번호를 찾는다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 'qa_player2');
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
    });

    await test.step('API 로 사유 없는 제재를 qa_player2 에 보낸다', async () => {
      const 응답 = await 제재걸기(page, 계정, { type: 'SUSPEND', reason: '', endsAt: null });
      const 코드 = await verify('응답 코드가 400 이다', 응답.status, 400);
      const 종류 = await verify('본문의 code 가 「INVALID」다', 응답.body.code, 'INVALID');
      const 문구 = await verify('본문에 message 가 들어 있다', typeof 응답.body.message === 'string' && 응답.body.message !== '', true);
      await verify('API 로 사유 없는 제재를 보내면 응답이 400 이고 본문이 code 「INVALID」와 message 를 담는다', 코드 && 종류 && 문구, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정, 'SUSPEND');
  }
});
