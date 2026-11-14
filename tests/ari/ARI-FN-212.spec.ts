import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본지급, 지급건찾기, 지급하기, 지급정리 } from './helpers/api.helper.js';
import { 두번째캐릭터번호 } from './helpers/grant.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-212',
  name: '같은 캐릭터 번호를 두 번 넣어 지급하면 우편이 한 통만 생긴다',
  apiDoc: 2,
  precondition: ['「두 번째 플레이어」 계정이 있다'],
  params: z.object({
    player2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    player2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    우편수: z.number().describe('그 지급 건 mails 의 우편 수').default(1),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, params, expected }) => {
  let 캐릭터 = 0;
  await test.step('「두 번째 플레이어」 캐릭터 번호를 찾는다', async () => {
    캐릭터 = await 두번째캐릭터번호(admin, params.player2Id ?? '');
    await verify('「두 번째 플레이어」 캐릭터를 찾았다', 캐릭터 > 0, true, { blocker: true });
  });
  await test.step('같은 캐릭터 번호를 두 번 넣어 지급한다', async () => {
    const 응답 = await 지급하기(admin, 기본지급(캐릭터, 'ARI-FN-212', { characterIds: [캐릭터, 캐릭터] }));
    let 지급번호 = 0;
    try {
      await verify('중복 번호 지급 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드, { blocker: true });
      const 몸 = (await 응답.json().catch(() => ({}))) as { id?: unknown };
      지급번호 = typeof 몸.id === 'number' ? 몸.id : 0;
      const 건 = await 지급건찾기(admin, 지급번호);
      await verify('GET /opsapi/grants 에서 그 지급 건을 찾았다', 건 !== null, true, { blocker: true });
      await verify('같은 캐릭터 번호를 두 번 넣어 지급하면 우편이 한 통만 생긴다', 건?.mails.length ?? 0, expected.우편수);
    } finally {
      await 지급정리(admin, 지급번호);
    }
  });
});
