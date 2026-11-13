import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-174',
  name: 'GET /opsapi/users 를 부르면 계정 번호가 큰 것부터 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/users 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/users');
    const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { id: number }[] };
    const 번호들 = (몸.items ?? []).map((u) => u.id);
    const 코드 = await verify('GET /opsapi/users 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    await verify('목록에 계정이 두 건 이상 있다', 번호들.length >= 2, true, { blocker: true });
    const 순서 = await verify('목록의 계정 번호가 큰 것부터 차례다', 번호들.join(', '), [...번호들].sort((a, b) => b - a).join(', '));
    await verify('GET /opsapi/users 를 부르면 계정 번호가 큰 것부터 보인다', 코드 && 순서, true);
  });
});
