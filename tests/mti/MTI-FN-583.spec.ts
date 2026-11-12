import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-583',
  name: '이미 있는 사용자명으로 가입하면 details.username 첫 오류가 ERR_TAKEN 이다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    오류: z.string().describe('첫 오류 이름').default('ERR_TAKEN'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 이름 = 'qa_user1';
  await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
    await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
  });
  await test.step('이미 있는 사용자명 qa_user1 로 가입한다', async () => {
    const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름, { email: `${고유이름('mti_')}@maxihan.com` }) });
    const 몸 = (await 응답.json()) as { details?: { username?: { error?: string }[] } };
    await verify('이미 있는 사용자명으로 가입하면 details.username 첫 오류가 ERR_TAKEN 이다', 몸.details?.username?.[0]?.error, expected.오류);
  });
});
