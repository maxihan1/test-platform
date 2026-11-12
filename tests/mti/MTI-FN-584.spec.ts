import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-584',
  name: '예약어 사용자명으로 가입하면 details.username 첫 오류가 ERR_RESERVED 다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    오류: z.string().describe('첫 오류 이름').default('ERR_RESERVED'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 이름 = 'admin';
  await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
    await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
  });
  await test.step('예약어 사용자명 admin 으로 가입한다', async () => {
    const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름, { email: `${고유이름('mti_')}@maxihan.com` }) });
    const 몸 = (await 응답.json()) as { details?: { username?: { error?: string }[] } };
    await verify('예약어 사용자명으로 가입하면 details.username 첫 오류가 ERR_RESERVED 다', 몸.details?.username?.[0]?.error, expected.오류);
  });
});
