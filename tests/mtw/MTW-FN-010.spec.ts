import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'MTW-FN-010',
  name: '서버 규칙 API 를 부르면 빈 목록이 돌아온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    규칙수: z.number().describe('서버 규칙 개수').default(0),
  }),
});
test(spec, async ({ request, expected }) => {
  await test.step('서버 규칙 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/instance/rules');
    await verify('서버 규칙 API 가 200 으로 돌아온다', 응답.status(), 200, { blocker: true });
    const 규칙 = (await 응답.json()) as unknown[];
    await verify('서버 규칙 API 를 부르면 빈 목록이 돌아온다', 규칙.length, expected.규칙수);
  });
});
