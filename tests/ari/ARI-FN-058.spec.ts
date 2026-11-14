import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-058',
  name: '없는 아이디로 POST /api/login 을 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('없는 아이디로 POST /api/login 을 부른다', async () => {
    const 응답 = await 게임로그인(request, `qa_none_${Date.now()}`, 'qa-any-password');
    const 코드 = await verify('없는 아이디 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('없는 아이디 로그인 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('없는 아이디로 POST /api/login 을 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});
