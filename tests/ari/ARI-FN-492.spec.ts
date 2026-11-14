import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-492',
  name: '틀린 고정 운영 키로 GET /opsapi/summary 를 부르면 401 이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: z.object({
    키헤더이름: z.string().describe('고정 운영 키 헤더 이름').default('X-Admin-Key'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('틀린 고정 운영 키로 GET /opsapi/summary 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/summary', { headers: { [params.키헤더이름]: 'qa-wrong-admin-key' } });
    await verify('틀린 고정 운영 키로 GET /opsapi/summary 를 부르면 401 이다', 응답.status(), expected.응답코드);
  });
});
