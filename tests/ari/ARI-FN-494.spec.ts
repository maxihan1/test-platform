import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-494',
  name: 'POST /api/login 에 JSON 이 아닌 본문을 보내면 415 다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(415),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('POST /api/login 에 text/plain 본문을 보낸다', async () => {
    const 응답 = await request.post('/api/login', { headers: { 'Content-Type': 'text/plain' }, data: 'UserName=qa&Password=qa' });
    await verify('POST /api/login 에 JSON 이 아닌 본문을 보내면 415 다', 응답.status(), expected.응답코드);
  });
});
