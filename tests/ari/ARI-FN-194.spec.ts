import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 계정상세 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-194',
  name: '캐릭터 이름으로 GET /opsapi/characters 를 검색하면 그 캐릭터 요약이 보인다',
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
  let 캐릭터번호 = 0;
  let 캐릭터이름 = '';
  await test.step('「두 번째 플레이어」 캐릭터 이름과 번호를 찾는다', async () => {
    const 계정번호 = await 계정번호찾기(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    const 캐릭터 = (await 계정상세(admin, 계정번호))?.characters[0];
    캐릭터번호 = 캐릭터?.id ?? 0;
    캐릭터이름 = 캐릭터?.name ?? '';
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터번호 > 0, true, { blocker: true });
  });
  await test.step('q 에 「두 번째 플레이어」 캐릭터 이름을 넣어 GET /opsapi/characters 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/characters', { params: { q: 캐릭터이름 } });
    const 몸 = (await 응답.json().catch(() => [])) as { id?: number }[];
    const 코드 = await verify('이름 검색 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 보임 = await verify('이름 검색 응답에 그 캐릭터 요약이 있다', Array.isArray(몸) && 몸.some((c) => c.id === 캐릭터번호), true);
    await verify('캐릭터 이름으로 GET /opsapi/characters 를 검색하면 그 캐릭터 요약이 보인다', 코드 && 보임, true);
  });
  await test.step('q 에 「두 번째 플레이어」 캐릭터 번호를 넣어 GET /opsapi/characters 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/characters', { params: { q: String(캐릭터번호) } });
    const 몸 = (await 응답.json().catch(() => [])) as { id?: number }[];
    const 코드 = await verify('번호 검색 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 보임 = await verify('번호 검색 응답에 그 캐릭터 요약이 있다', Array.isArray(몸) && 몸.some((c) => c.id === 캐릭터번호), true);
    await verify('캐릭터 번호로 검색했을 때도 그 캐릭터 요약이 보인다', 코드 && 보임, true);
  });
});
