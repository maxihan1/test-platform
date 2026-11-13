import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입제출 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-520',
  name: '빈 아이디로 계정 만들기를 처음 제출하면 302 로 가입된다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
  held: '보류 — 빈 아이디 계정이 없는 서버 상태',
});

test(spec, async ({ request, expected }) => {
  await test.step('빈 아이디로 계정 만들기를 제출한다', async () => {
    const 응답 = await 가입제출(request, { userName: '', email: 'qa-empty-id@example.invalid', password: 'Qa123456x!' });
    await verify('빈 아이디로 계정 만들기를 처음 제출하면 302 로 가입된다', 응답.status(), expected.응답코드);
  });
});
