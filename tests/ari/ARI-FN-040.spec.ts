import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-040',
  name: 'POST /api/login 에 깨진 JSON 을 보내면 400 이고 본문이 application/problem+json 형식이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('POST /api/login 에 깨진 JSON 을 보낸다', async () => {
    const 응답 = await request.post('/api/login', { headers: { 'Content-Type': 'application/json' }, data: '{"UserName": ' });
    const 코드 = await verify('깨진 JSON 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 형식 = await verify('응답 Content-Type 이 application/problem+json 이다', (응답.headers()['content-type'] ?? '').startsWith('application/problem+json'), true);
    await verify('POST /api/login 에 깨진 JSON 을 보내면 400 이고 본문이 application/problem+json 형식이다', 코드 && 형식, true);
  });
});
