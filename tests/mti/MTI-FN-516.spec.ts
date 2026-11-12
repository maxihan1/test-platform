import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-516',
  name: 'redirect_uris 를 비워 앱을 등록하면 서버 오류(5xx) 없이 응답한다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    서버오류없음: z.boolean().describe('서버 오류(5xx) 없이 응답하는지').default(true),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('redirect_uris 를 비워 POST /api/v1/apps 를 부른다', async () => {
    const 응답 = await request.post('/api/v1/apps', { data: { client_name: 'MTI 시험 앱', redirect_uris: '', scopes: 'read' } });
    await verify('redirect_uris 를 비워 앱을 등록하면 서버 오류(5xx) 없이 응답한다', 응답.status() < 500, expected.서버오류없음);
  });
});
