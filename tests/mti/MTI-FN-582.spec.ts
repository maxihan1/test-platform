import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-582',
  name: '가입이 닫힌 서버에 가입하면 응답 코드가 403 이다',
  apiDoc: 1,
  held: '보류 — 가입을 닫는 서버 설정을 API 로 바꿀 길이 없다',
  precondition: ['가입이 닫힌 서버다', '쓰기 범위 시험 앱 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 이름 = 고유이름('mti_');
  try {
    await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
      await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    });
    await test.step('가입이 닫힌 서버에 POST /api/v1/accounts 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름) });
      await verify('가입이 닫힌 서버에 가입하면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 가입계정지우기(admin, 이름);
  }
});
