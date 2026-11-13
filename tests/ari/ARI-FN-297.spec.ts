import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 본문글 } from './helpers/api.helper.js';
import { 가입제출, 일회용아이디 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-297',
  name: '이미 있는 「일반 회원」 아이디로 계정 만들기를 제출하면 400 과 본문 「Username not available」이다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  await test.step('「일반 회원」 아이디로 계정 만들기를 제출한다', async () => {
    const 계정번호 = await 계정번호찾기(admin, params.playerId ?? '');
    await verify('「일반 회원」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    const 응답 = await 가입제출(request, { userName: params.playerId ?? '', email: `${일회용아이디()}@example.invalid`, password: 'Qa123456x!' });
    const 코드 = await verify('계정 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('응답 본문이 「Username not available」이다', (await 본문글(응답)).trim(), 'Username not available');
    await verify('이미 있는 「일반 회원」 아이디로 계정 만들기를 제출하면 400 과 본문 「Username not available」이다', 코드 && 본문, true);
  });
});
