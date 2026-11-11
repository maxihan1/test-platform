import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 고유이름 } from './helpers/auth.helper.js';
import { 검증문구, 리스트개수, 리스트채우기, 리스트비우기 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-667',
  name: '리스트가 50개일 때 만들면 오류 문구가 「리스트 최대 개수를 초과합니다」 다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '두 번째 사용자의 리스트가 50개다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('리스트 최대 개수를 초과합니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  let 번호들: string[] = [];
  try {
    번호들 = await 리스트채우기(request, 토큰, 50);
    const 개수 = await 리스트개수(request, 토큰);
    await test.step('준비한 리스트를 확인한다', async () => {
      await verify('두 번째 사용자의 리스트가 50개다', 개수 === 50, true, { blocker: true });
    });
    await test.step('리스트가 50개일 때 POST /api/v1/lists 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: 고유이름('MTI 리스트 ') } });
      const 몸 = (await 응답.json()) as { id?: string; error?: string };
      if (응답.status() === 200) 번호들.push(몸.id ?? '');
      await verify('리스트가 50개일 때 만들면 오류 문구가 「리스트 최대 개수를 초과합니다」 다', 검증문구(몸.error), expected.오류문구);
    });
  } finally {
    await 리스트비우기(request, 토큰, 번호들);
  }
});
