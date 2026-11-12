import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-687',
  name: '인스턴스 정보를 부르면 configuration.media_attachments.description_limit 이 10000 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    설명한도: z.number().describe('미디어 설명 글자 수 한도').default(10000),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 미디어 제한값을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { media_attachments?: { description_limit?: number } } };
    await verify('인스턴스 정보를 부르면 configuration.media_attachments.description_limit 이 10000 이다', 몸.configuration?.media_attachments?.description_limit, expected.설명한도);
  });
});
