import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 큰제목들 } from './helpers/html.helper.js';
import { 본문글 } from './helpers/api.helper.js';
import { 웹로그인 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-311',
  name: '주소에 page 질의를 붙여 웹 로그인하면 로그인 화면이 다시 보인다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('주소에 page 질의를 붙여 「일반 회원」으로 POST /Account/Login 을 보낸다', async () => {
    const 응답 = await 웹로그인(request, params.playerId ?? '', params.playerPassword ?? '', '?page=1');
    const 코드 = await verify('page 질의를 붙인 웹 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 화면 = await verify('큰 제목 「Login」이 보인다', 큰제목들(await 본문글(응답)).includes('Login'), true);
    await verify('주소에 page 질의를 붙여 웹 로그인하면 로그인 화면이 다시 보인다', 코드 && 화면, true);
  });
});
