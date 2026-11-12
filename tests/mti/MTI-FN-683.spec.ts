import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-683',
  name: '도메인 차단 공개가 꺼진 서버에서 차단 서버 목록을 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/instance/domain_blocks 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/instance/domain_blocks');
    await verify('도메인 차단 공개가 꺼진 서버에서 차단 서버 목록을 부르면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});
