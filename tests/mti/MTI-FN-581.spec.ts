import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문, 긴이메일 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-581',
  name: '이메일 320자로 가입하면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: z.object({
    안쪽글자수: z.number().int().min(1).describe('이메일 글자 수(허용 범위 안) — 28자 이상 320자 이하').default(320),
    바깥글자수: z.number().int().min(1).describe('이메일 글자 수(허용 범위 밖) — 321자 이상').default(321),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('안쪽 값의 응답 코드').default(200),
    바깥응답코드: z.number().describe('바깥 값의 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 안쪽이름 = 고유이름('mti_');
  const 바깥이름 = 고유이름('mti_');
  try {
    await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
      await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    });
    await test.step('이메일 320자로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(안쪽이름, { email: 긴이메일(안쪽이름, params.안쪽글자수) }) });
      await verify('이메일 320자로 가입하면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('이메일 321자로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(바깥이름, { email: 긴이메일(바깥이름, params.바깥글자수) }) });
      await verify('이메일 321자 가입의 응답 코드가 422 다', 응답.status(), expected.바깥응답코드);
    });
  } finally {
    await 가입계정지우기(admin, 안쪽이름);
    await 가입계정지우기(admin, 바깥이름);
  }
});
