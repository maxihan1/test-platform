import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-280',
  name: 'GET /Account/RegisterSuccess 를 로그인 없이 부르면 200 이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('로그인 없이 GET /Account/RegisterSuccess 를 부른다', async () => {
    const 응답 = await request.get('/Account/RegisterSuccess', { maxRedirects: 0 });
    await verify('GET /Account/RegisterSuccess 를 로그인 없이 부르면 200 이다', 응답.status(), expected.응답코드);
  });
});
