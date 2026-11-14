import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원로그인 } from './helpers/html.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-344',
  name: '로그인한 채 GET /Account/Delete 를 부르면 500 이다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(500),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('일회용 회원으로 웹 로그인한 채 GET /Account/Delete 를 부른다', async () => {
    const { 회원, 로그인 } = await 일회용회원로그인(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    await verify('일회용 회원 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 응답 = await request.get('/Account/Delete', { maxRedirects: 0 });
    await verify('로그인한 채 GET /Account/Delete 를 부르면 500 이다', 응답.status(), expected.응답코드);
  });
});
