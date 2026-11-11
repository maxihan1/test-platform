import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-690',
  name: '인스턴스 정보를 부르면 configuration.translation.enabled 가 false 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    번역사용: z.boolean().describe('번역이 켜져 있는지').default(false),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 번역 설정을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { translation?: { enabled?: boolean } } };
    await verify('인스턴스 정보를 부르면 configuration.translation.enabled 가 false 다', 몸.configuration?.translation?.enabled, expected.번역사용);
  });
});
