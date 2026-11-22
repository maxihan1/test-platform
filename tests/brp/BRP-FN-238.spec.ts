import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 로비로되돌리기, 봇기록기다리기, 봇시키기, 봇켜기, 줄글 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-238',
  name: '장착 중인 아이템을 팔려 하면 오류 알림 「장착 중인 아이템은 팔 수 없습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 「녹슨 단검」을 장착하고 로비에 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  let 봇 = '';
  await test.cleanup('봇을 끄고 방을 로비로 돌린 뒤 두 번째 플레이어를 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('두 번째 플레이어 봇이 「녹슨 단검」을 장착하고 로비에 있는 것을 확인한다', async () => {
    봇 = await 봇켜기(admin, 봇아이디, 봇비밀번호);
    await 봇시키기(admin, 봇, 'buy:녹슨 단검');
    const 구매 = await 봇기록기다리기(admin, 봇, (칸) => 줄글(칸).includes('녹슨 단검') && 줄글(칸).includes('1개 구매'));
    await verify('봇이 「녹슨 단검」을 샀다', 구매 !== null, true, { blocker: true });
    await 봇시키기(admin, 봇, 'equip:녹슨 단검');
    const 장착 = await 봇기록기다리기(admin, 봇, (칸) => 줄글(칸).includes('녹슨 단검') && 줄글(칸).includes('장착'));
    await verify('봇이 「녹슨 단검」을 장착했다', 장착 !== null, true, { blocker: true });
  });

  await test.step('봇에게 「녹슨 단검」 판매를 보내게 하고 봇 기록을 읽는다', async () => {
    await 봇시키기(admin, 봇, 'sell:녹슨 단검');
    const 줄 = await 봇기록기다리기(admin, 봇, (칸) => 줄글(칸).includes('장착 중인 아이템은 팔 수 없습니다'));
    await verify('장착 중인 아이템을 팔려 하면 오류 알림 「장착 중인 아이템은 팔 수 없습니다」가 뜬다', 줄 !== null, true);
  });
});
