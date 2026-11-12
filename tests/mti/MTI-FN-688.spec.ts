import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-688',
  name: '인스턴스 정보를 부르면 configuration.polls.max_options 가 4 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    항목수: z.number().describe('설문 항목 수 한도').default(4),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 설문 제한값을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { polls?: { max_options?: number } } };
    await verify('인스턴스 정보를 부르면 configuration.polls.max_options 가 4 다', 몸.configuration?.polls?.max_options, expected.항목수);
  });
});
