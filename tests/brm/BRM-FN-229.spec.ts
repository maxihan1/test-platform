import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇에게시키고알림보기 } from './helpers/items-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-229',
  name: '상점에서 팔지 않는 불꽃의 검을 요청하면 「상점에서 팔지 않는 아이템입니다」 오류 알림이 온다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 접속해 있다'],
  techniques: ['동등 분할'],
  elements: ['item:불꽃의 검'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 봇 = '';
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어가 봇으로 접속한다', async () => {
    봇 = await 봇켜기(admin, 둘째);
    await verify('접속자에 두 번째 플레이어 봇이 있다', (await 접속자(admin)).bots.includes(봇), true, { blocker: true });
  });
  await test.step('봇에게 불꽃의 검 구매를 시킨다', async () => {
    await verify('상점에서 팔지 않는 불꽃의 검을 요청하면 「상점에서 팔지 않는 아이템입니다」 오류 알림이 온다', await 봇에게시키고알림보기(admin, 봇, 'buy:불꽃의 검', '상점에서 팔지 않는 아이템입니다'), true);
  });
});
