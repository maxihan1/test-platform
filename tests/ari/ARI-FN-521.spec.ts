import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기 } from './helpers/api.helper.js';
import { 가입제출, 일회용아이디 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-521',
  name: '「일반 회원」 아이디를 대문자로 변경해 제출하면 대소문자 구분 규칙대로 가입 여부가 갈린다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('대문자로 바꾼 아이디의 가입 응답 코드 — 대소문자를 구분하면 302, 구분하지 않으면 400'),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 아이디 대소문자 구분 기준',
});

test(spec, async ({ request, admin, params, expected }) => {
  await test.step('「일반 회원」 아이디를 대문자로 변경해 계정 만들기를 제출한다', async () => {
    const 계정번호 = await 계정번호찾기(admin, params.playerId ?? '');
    await verify('「일반 회원」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    const 응답 = await 가입제출(request, { userName: (params.playerId ?? '').toUpperCase(), email: `${일회용아이디()}@example.invalid`, password: 'Qa123456x!' });
    await verify('「일반 회원」 아이디를 대문자로 변경해 제출하면 대소문자 구분 규칙대로 가입 여부가 갈린다', 응답.status(), expected.응답코드);
  });
});
