import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-689',
  name: '인스턴스 정보를 부르면 registrations.enabled 가 true 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    가입허용: z.boolean().describe('가입이 열려 있는지').default(true),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v2/instance 로 가입 설정을 읽는다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    const 몸 = (await 응답.json()) as { registrations?: { enabled?: boolean } };
    await verify('인스턴스 정보를 부르면 registrations.enabled 가 true 다', 몸.registrations?.enabled, expected.가입허용);
  });
});
