import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-684',
  name: '인스턴스 정보를 부르면 version 이 4.7.5 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    서버판: z.string().describe('서버 판').default('4.7.5'),
    API판: z.number().describe('API 판').default(11),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 서버 판을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { version?: string; api_versions?: { mastodon?: number } };
    await verify('인스턴스 정보를 부르면 version 이 4.7.5 다', 몸.version, expected.서버판);
    await verify('api_versions.mastodon 이 11 이다', 몸.api_versions?.mastodon, expected.API판);
  });
});
