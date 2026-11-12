import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-686',
  name: '인스턴스 정보를 부르면 configuration.statuses.max_characters 가 500 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    글자한도: z.number().describe('글 글자 수 한도').default(500),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 글 제한값을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { statuses?: { max_characters?: number } } };
    await verify('인스턴스 정보를 부르면 configuration.statuses.max_characters 가 500 이다', 몸.configuration?.statuses?.max_characters, expected.글자한도);
  });
});
