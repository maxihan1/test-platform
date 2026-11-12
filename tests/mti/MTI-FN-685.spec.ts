import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-685',
  name: '인스턴스 정보를 부르면 configuration.accounts.max_display_name_length 가 40 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    표시이름한도: z.number().describe('표시 이름 글자 수 한도').default(40),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 계정 제한값을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { accounts?: { max_display_name_length?: number } } };
    await verify('인스턴스 정보를 부르면 configuration.accounts.max_display_name_length 가 40 이다', 몸.configuration?.accounts?.max_display_name_length, expected.표시이름한도);
  });
});
