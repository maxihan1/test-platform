import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-388',
  name: '길드장이 탈퇴하면 가장 먼저 들어온 일반 회원이 길드장이 되어 「[길드장]」이 붙는다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드장이고 일반 회원 · 세 번째 플레이어 봇이 차례로 들어왔다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
  });
  await test.step('두 번째 플레이어 봇의 길드에 일반 회원과 세 번째 플레이어 봇이 차례로 들어온 뒤 일반 회원이 로비에 들어간다', async () => {
    await verify('두 번째 플레이어 봇이 길드장이고 일반 회원 · 세 번째 플레이어 봇이 차례로 들어왔다', await 길드미리만들기(admin, 나, { 장: 봇, 이름: 'qa388', 들어옴: [나, 봇3] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('봇 길드장이 「길드 탈퇴」를 한다', async () => {
    await 봇시키기(admin, 봇.아이디, 'guild_leave');
    await new 공통HUD(game).알림뜸(`${봇.아이디} 님이 길드를 떠났습니다`, 15_000);
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 2명');
    await verify('길드장이 탈퇴하면 가장 먼저 들어온 일반 회원이 길드장이 되어 「[길드장]」이 붙는다', (await 길드.길드원줄글(0))?.includes(`[길드장] ${나.아이디}`) ?? false, true);
  });
});
