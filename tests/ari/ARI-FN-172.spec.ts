import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-172',
  name: 'q 에 「두 번째 플레이어」 아이디를 넣어 계정을 검색하면 items 에 그 계정이 보인다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  await test.step('q 에 「두 번째 플레이어」 아이디를 넣어 GET /opsapi/users 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/users', { params: { q: params.player2Id ?? '' } });
    const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { userName?: string }[] };
    const 코드 = await verify('GET /opsapi/users 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 보임 = await verify('items 에 넣은 아이디의 계정이 있다', (몸.items ?? []).some((u) => u.userName === (params.player2Id ?? '')), true);
    await verify('q 에 「두 번째 플레이어」 아이디를 넣어 계정을 검색하면 items 에 그 계정이 보인다', 코드 && 보임, true);
  });
});
