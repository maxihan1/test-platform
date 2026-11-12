import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 고유이름 } from './helpers/auth.helper.js';
import { 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-670',
  name: 'context 없이 필터를 만들면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    모르는context: z.string().describe('모르는 context 값 — home public notifications thread account 가 아닌 글자').default('mti'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호들: string[] = [];
  try {
    await test.step('context 를 비워 필터를 만든다', async () => {
      const 응답 = await request.post('/api/v2/filters', { headers: 머리(토큰), data: { title: 고유이름('MTI 필터 '), context: [], filter_action: 'warn' } });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('context 없이 필터를 만들면 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
    await test.step('context 에 mti 를 넣어 필터를 만든다', async () => {
      const 응답 = await request.post('/api/v2/filters', { headers: 머리(토큰), data: { title: 고유이름('MTI 필터 '), context: [params.모르는context], filter_action: 'warn' } });
      if (응답.status() === 200) 번호들.push(((await 응답.json()) as { id?: string }).id ?? '');
      await verify('모르는 context 필터 만들기의 응답 코드가 422 다', 응답.status(), expected.응답코드);
    });
  } finally {
    for (const 번호 of 번호들) await 필터지우기(request, 토큰, 번호);
  }
});
