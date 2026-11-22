import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 로비로되돌리기, 봇기록기다리기, 봇시키기, 봇켜기, 접속상태, 줄글 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-223',
  name: '상점에 없는 아이템을 사려 하면 오류 알림 「상점에서 팔지 않는 아이템입니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 로비에 있다'],
  techniques: ['동등 분할'],
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

  await test.step('두 번째 플레이어 봇이 로비에 있는 것을 확인한다', async () => {
    봇 = await 봇켜기(admin, 봇아이디, 봇비밀번호);
    await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속상태(admin)).bots.includes(봇), true, { blocker: true });
  });

  await test.step('봇에게 상점에 없는 「불꽃의 검」 구매를 보내게 하고 봇 기록을 읽는다', async () => {
    await 봇시키기(admin, 봇, 'buy:불꽃의 검');
    const 줄 = await 봇기록기다리기(admin, 봇, (칸) => 줄글(칸).includes('상점에서 팔지 않는 아이템입니다'));
    await verify('상점에 없는 아이템을 사려 하면 오류 알림 「상점에서 팔지 않는 아이템입니다」가 뜬다', 줄 !== null, true);
  });
});
