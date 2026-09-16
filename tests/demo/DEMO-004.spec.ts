import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-004',
  name: '선택한 자원 목록을 조회하면 비어 있지 않은 배열이 돌아온다',
  precondition: ['자원 목록 데모 API에 접근할 수 있다'],
  params: z.object({
    resource: z.enum(['albums', 'photos', 'todos']).describe('조회할 자원').default('albums'),
  }),
  expected: z.object({
    statusCode: z.number().describe('응답 코드').default(200),
    notEmpty: z.boolean().describe('목록이 비어 있지 않은지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let items: unknown[] = [];

  await test.step('선택한 자원 목록을 조회한다', async () => {
    const res = await request.get(`https://jsonplaceholder.typicode.com/${params.resource}`);
    await verify('응답 코드가 기대와 같다', res.status(), expected.statusCode, { blocker: true });
    items = await res.json();
  });

  await test.step('돌아온 목록을 확인한다', async () => {
    await verify('목록이 배열로 돌아온다', Array.isArray(items), true);
    await verify('목록이 비어 있지 않다', items.length > 0, expected.notEmpty);
  });
});
