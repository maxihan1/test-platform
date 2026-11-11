import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문, 긴글 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-580',
  name: '비밀번호 7자로 가입하면 details.password 첫 오류가 ERR_TOO_SHORT 다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: z.object({
    글자수: z.number().int().min(1).describe('비밀번호 글자 수 — 1자 이상 7자 이하').default(7),
  }),
  expected: z.object({
    오류: z.string().describe('첫 오류 이름').default('ERR_TOO_SHORT'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 이름 = 고유이름('mti_');
  try {
    await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
      await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    });
    await test.step('비밀번호 7자로 POST /api/v1/accounts 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름, { password: 긴글('Aa1-', params.글자수) }) });
      const 몸 = (await 응답.json()) as { details?: { password?: { error?: string }[] } };
      await verify('비밀번호 7자로 가입하면 details.password 첫 오류가 ERR_TOO_SHORT 다', 몸.details?.password?.[0]?.error, expected.오류);
    });
  } finally {
    await 가입계정지우기(admin, 이름);
  }
});
