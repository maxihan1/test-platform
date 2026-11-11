import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './helpers/auth.helper.js';
import { 가입본문, 긴글 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-579',
  name: '비밀번호 7자로 가입하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['쓰기 범위 시험 앱 토큰이 있다'],
  params: z.object({
    너무짧은글자수: z.number().int().min(1).describe('비밀번호 글자 수(허용 범위 밖, 짧음) — 1자 이상 7자 이하').default(7),
    가장짧은글자수: z.number().int().min(1).describe('비밀번호 글자 수(허용 범위 안, 짧은 쪽) — 8자 이상 72자 이하').default(8),
    가장긴글자수: z.number().int().min(1).describe('비밀번호 글자 수(허용 범위 안, 긴 쪽) — 8자 이상 72자 이하').default(72),
    너무긴글자수: z.number().int().min(1).describe('비밀번호 글자 수(허용 범위 밖, 김) — 73자 이상').default(73),
  }),
  expected: z.object({
    바깥응답코드: z.number().describe('허용 범위 밖의 응답 코드').default(422),
    안쪽응답코드: z.number().describe('허용 범위 안의 응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 앱 = await 앱만들기(request, 'read write');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write');
  const 이름들 = [고유이름('mti_'), 고유이름('mti_'), 고유이름('mti_'), 고유이름('mti_')];
  try {
    await test.step('쓰기 범위 시험 앱 토큰을 확인한다', async () => {
      await verify('쓰기 범위 시험 앱 토큰이 있다', 앱토큰 !== '', true, { blocker: true });
    });
    await test.step('비밀번호 7자로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름들[0], { password: 긴글('Aa1-', params.너무짧은글자수) }) });
      await verify('비밀번호 7자로 가입하면 응답 코드가 422 다', 응답.status(), expected.바깥응답코드);
    });
    await test.step('비밀번호 8자로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름들[1], { password: 긴글('Aa1-', params.가장짧은글자수) }) });
      await verify('비밀번호 8자 가입의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('비밀번호 72자로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름들[2], { password: 긴글('Aa1-', params.가장긴글자수) }) });
      await verify('비밀번호 72자 가입의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('비밀번호 73자로 가입한다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(앱토큰), data: 가입본문(이름들[3], { password: 긴글('Aa1-', params.너무긴글자수) }) });
      await verify('비밀번호 73자 가입의 응답 코드가 422 다', 응답.status(), expected.바깥응답코드);
    });
  } finally {
    for (const 이름 of 이름들) await 가입계정지우기(admin, 이름);
  }
});
