import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-176',
  name: '「두 번째 플레이어」 계정 번호로 계정 상세를 부르면 그 계정의 userName · characters · sanctions 가 돌아온다',
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
  let 계정번호 = 0;
  await test.step('「두 번째 플레이어」 계정 번호를 찾는다', async () => {
    계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 계정 번호로 GET /opsapi/users/{id} 를 부른다', async () => {
    const 응답 = await admin.get(`/opsapi/users/${계정번호}`);
    const 몸 = (await 응답.json().catch(() => ({}))) as { userName?: string; characters?: unknown; sanctions?: unknown };
    const 코드 = await verify('GET /opsapi/users/{id} 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 이름 = await verify('응답 userName 이 「두 번째 플레이어」 아이디와 같다', 몸.userName ?? '', params.player2Id ?? '');
    const 캐릭터 = await verify('응답 characters 가 배열이다', Array.isArray(몸.characters), true);
    const 제재 = await verify('응답 sanctions 가 배열이다', Array.isArray(몸.sanctions), true);
    await verify('「두 번째 플레이어」 계정 번호로 계정 상세를 부르면 그 계정의 userName · characters · sanctions 가 돌아온다', 코드 && 이름 && 캐릭터 && 제재, true);
  });
});
