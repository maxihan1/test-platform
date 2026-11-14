import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-062',
  name: '틀린 공유 비밀로 POST /api/serverlogin 을 부르면 400 과 본문 「Invalid password」다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    본문: z.string().describe('응답 본문 글자').default('Invalid password'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('틀린 공유 비밀로 POST /api/serverlogin 을 부른다', async () => {
    const 응답 = await request.post('/api/serverlogin', { data: { SharedSecret: 'qa-wrong-shared-secret' } });
    const 코드 = await verify('틀린 공유 비밀 서버 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('틀린 공유 비밀 서버 로그인 응답 본문이 기대 결과와 같다', (await 본문글(응답)).trim(), expected.본문);
    await verify('틀린 공유 비밀로 POST /api/serverlogin 을 부르면 400 과 본문 「Invalid password」다', 코드 && 본문, true);
  });
});
