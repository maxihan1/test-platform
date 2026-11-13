import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급건찾기, 지급하고번호, 지급정리 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-208',
  name: '지급하면 지급 건 mails[].status 가 SENT · TAKEN · RECALLED · PARTLY_RECALLED · DELETED_BY_PLAYER 가운데 하나다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    상태들: z.string().describe('우편 상태로 허용된 값들, 쉼표로 이어').default('SENT,TAKEN,RECALLED,PARTLY_RECALLED,DELETED_BY_PLAYER'),
  }),
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('「두 번째 플레이어」 캐릭터에 지급한 뒤 그 지급 건 mails 의 status 를 읽는다', async () => {
    const 지급번호 = await 지급하고번호(admin, 기본지급(캐릭터, 'ARI-FN-208'));
    try {
      await verify('시험용 지급이 만들어졌다', 지급번호 > 0, true, { blocker: true });
      const 건 = await 지급건찾기(admin, 지급번호);
      await verify('GET /opsapi/grants 에서 그 지급 건을 찾았다', 건 !== null, true, { blocker: true });
      const 상태 = 건?.mails[0]?.status ?? '';
      await verify('지급하면 지급 건 mails[].status 가 SENT · TAKEN · RECALLED · PARTLY_RECALLED · DELETED_BY_PLAYER 가운데 하나다', expected.상태들.split(',').includes(상태), true);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
