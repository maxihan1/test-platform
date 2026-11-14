import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-497',
  name: '토큰 없이 /api 데이터 API 를 부르면 401 응답에 WWW-Authenticate: Bearer 헤더가 붙는다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    인증방식: z.string().describe('WWW-Authenticate 헤더의 인증 방식').default('Bearer'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 POST /api/getguilds 를 불러 응답 헤더를 읽는다', async () => {
    const 응답 = await request.post('/api/getguilds', { data: {} });
    const 코드 = await verify('토큰 없는 /api/getguilds 응답 코드가 401 이다', 응답.status(), 401);
    const 헤더 = await verify('응답 WWW-Authenticate 헤더가 Bearer 로 시작한다', (응답.headers()['www-authenticate'] ?? '').startsWith(expected.인증방식), true);
    await verify('토큰 없이 /api 데이터 API 를 부르면 401 응답에 WWW-Authenticate: Bearer 헤더가 붙는다', 코드 && 헤더, true);
  });
});
