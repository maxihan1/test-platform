import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-507',
  name: 'scopes 를 빼고 앱을 등록하면 응답의 scopes 가 read 하나다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    기본범위: z.string().describe('기본 범위').default('read'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('scopes 를 빼고 POST /api/v1/apps 로 앱을 등록한다', async () => {
    const 응답 = await request.post('/api/v1/apps', { data: { client_name: 'MTI 시험 앱', redirect_uris: 'urn:ietf:wg:oauth:2.0:oob' } });
    const 몸 = (await 응답.json()) as { scopes?: unknown };
    const 범위 = Array.isArray(몸.scopes) ? 몸.scopes.join(' ') : String(몸.scopes ?? '');
    await verify('scopes 를 빼고 앱을 등록하면 응답의 scopes 가 read 하나다', 범위, expected.기본범위);
  });
});
