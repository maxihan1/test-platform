import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로 } from './helpers/html.helper.js';
import { 웹로그인 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-310',
  name: '「일반 회원」으로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('「일반 회원」 아이디와 비밀번호로 POST /Account/Login 을 보낸다', async () => {
    const 응답 = await 웹로그인(request, params.playerId ?? '', params.playerPassword ?? '');
    const 코드 = await verify('웹 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
    await verify('「일반 회원」으로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다', 코드 && 주소, true);
  });
});
