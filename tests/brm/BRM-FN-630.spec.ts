import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇길드만들기, 봇들켜기, 봇이받음 } from './helpers/social-tools.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-630',
  name: '이미 길드가 있는데 만들면 「이미 길드에 들어가 있습니다」 오류가 온다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드장이고 골드가 600 이다'],
  elements: ['move:길드 길드장→길드원'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
  });
  await test.step('두 번째 플레이어 봇이 길드를 만든 뒤 골드를 600 으로 맞춘다', async () => {
    await 봇들켜기(admin, [봇]);
    const 만듦 = await 봇길드만들기(admin, 봇, 'qa630');
    await 봇기록(admin, 봇.아이디, true);
    await 봇시키기(admin, 봇.아이디, 'gm:gold 600');
    const 골드됨 = await 봇이받음(admin, 봇.아이디, 'toast', 'gold 600', 10_000);
    await verify('두 번째 플레이어 봇이 길드장이고 골드가 600 이다', 만듦 && 골드됨, true, { blocker: true });
  });
  await test.step('봇에게 다른 이름으로 길드 만들기를 시킨다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    await 봇시키기(admin, 봇.아이디, 'guild_create:qa630다른');
    await verify('이미 길드가 있는데 만들면 「이미 길드에 들어가 있습니다」 오류가 온다', await 봇이받음(admin, 봇.아이디, 'toast', '이미 길드에 들어가 있습니다'), true);
  });
});
