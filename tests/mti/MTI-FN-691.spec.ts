import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-691',
  name: '인스턴스 정보를 부르면 configuration.timelines_access.live_feeds.local 이 public 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    공개범위: z.string().describe('로컬 실시간 피드 공개 범위').default('public'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 타임라인 접근 설정을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { configuration?: { timelines_access?: { live_feeds?: { local?: string } } } };
    await verify('인스턴스 정보를 부르면 configuration.timelines_access.live_feeds.local 이 public 이다', 몸.configuration?.timelines_access?.live_feeds?.local, expected.공개범위);
  });
});
