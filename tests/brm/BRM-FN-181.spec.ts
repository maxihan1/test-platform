import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇에게시키고알림보기, 서버개수 } from './helpers/items-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-181',
  name: '체력 물약 장착을 요청하면 장착되지 않고 「장착할 수 없는 아이템입니다」 오류가 온다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 접속해 있다'],
  techniques: ['상태 전이'],
  elements: ['item:체력 물약'],
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
  await test.step('봇에게 체력 물약 장착을 시킨다', async () => {
    const 왔다 = await 봇에게시키고알림보기(admin, 봇, 'equip:체력 물약', '장착할 수 없는 아이템입니다');
    const 오류 = await verify('「장착할 수 없는 아이템입니다」 오류가 온다', 왔다, true);
    const 그대로 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 3개 그대로다', await 서버개수(admin, 둘째, '체력 물약'), 3);
    await verify('체력 물약 장착을 요청하면 장착되지 않고 「장착할 수 없는 아이템입니다」 오류가 온다', 오류 && 그대로, true);
  });
});
