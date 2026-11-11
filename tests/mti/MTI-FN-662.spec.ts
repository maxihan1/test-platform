import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 고유이름 } from './helpers/auth.helper.js';
import { 검증문구, 추천태그개수, 추천태그채우기, 추천태그비우기 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-662',
  name: '추천 해시태그가 10개일 때 더하면 오류 문구가 「추천 해시태그 최대 개수를 초과합니다」 다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '추천 해시태그가 10개다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('추천 해시태그 최대 개수를 초과합니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  let 번호들: string[] = [];
  try {
    번호들 = await 추천태그채우기(request, 토큰, 10);
    const 개수 = await 추천태그개수(request, 토큰);
    await test.step('준비한 추천 해시태그를 확인한다', async () => {
      await verify('추천 해시태그가 10개다', 개수 === 10, true, { blocker: true });
    });
    await test.step('추천 해시태그가 10개일 때 POST /api/v1/featured_tags 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/featured_tags', { headers: 머리(토큰), data: { name: 고유이름('mti추천') } });
      const 몸 = (await 응답.json()) as { id?: string; error?: string };
      if (응답.status() === 200) 번호들.push(몸.id ?? '');
      await verify('추천 해시태그가 10개일 때 더하면 오류 문구가 「추천 해시태그 최대 개수를 초과합니다」 다', 검증문구(몸.error), expected.오류문구);
    });
  } finally {
    await 추천태그비우기(request, 토큰, 번호들);
  }
});
