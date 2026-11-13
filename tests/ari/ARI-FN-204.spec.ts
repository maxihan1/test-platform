import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급건찾기, 지급하고번호, 지급정리 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-204',
  name: '캐릭터 하나에 지급하면 그 지급 건 mails 에 우편 한 통이 보인다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    우편수: z.number().describe('그 지급 건 mails 의 우편 수').default(1),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터 하나에 지급한 뒤 GET /opsapi/grants 에서 그 지급 건을 찾는다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-204'));
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 건 = await 지급건찾기(admin, 지급번호);
      await verify('GET /opsapi/grants 에서 그 지급 건을 찾았다', 건 !== null, true, { blocker: true });
      await verify('캐릭터 하나에 지급하면 그 지급 건 mails 에 우편 한 통이 보인다', 건?.mails.length ?? 0, expected.우편수);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
