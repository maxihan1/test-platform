import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 길드미리만들기, 내길드를떠나봇길드원으로, 로비준비, 안내창있나 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-387',
  name: '길드원이 탈퇴하면 남은 길드장에게 「qa_player2 님이 길드를 떠났습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 번째 플레이어 봇이 길드원이다', '두 번째 플레이어 봇이 길드장이고 일반 회원이 길드원이다'],
  elements: ['move:길드 길드원→없음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
  });
  await test.step('길드를 만든 일반 회원의 길드에 두 번째 플레이어 봇이 길드원으로 들어가고 일반 회원이 로비에 들어간다', async () => {
    await verify('일반 회원이 길드장이고 두 번째 플레이어 봇이 길드원이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa387', 들어옴: [봇] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('봇이 「길드 탈퇴」를 한다', async () => {
    await 봇시키기(admin, 봇.아이디, 'guild_leave');
    await verify('길드원이 탈퇴하면 남은 길드장에게 「qa_player2 님이 길드를 떠났습니다」 알림이 뜬다', await new 공통HUD(game).알림뜸(`${봇.아이디} 님이 길드를 떠났습니다`), true);
  });
  await test.step('일반 회원이 길드를 떠나 두 번째 플레이어 봇의 길드에 길드원으로 들어간다', async () => {
    await verify('두 번째 플레이어 봇이 길드장이고 일반 회원이 길드원이다', await 내길드를떠나봇길드원으로(game, admin, 나, 봇, 'qa387봇'), true, { blocker: true });
  });
  await test.step('길드 창의 「길드 탈퇴」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.탈퇴누르기();
    const 안내 = await verify('「아직 길드가 없습니다」가 보인다', await 길드.글줄뜸('아직 길드가 없습니다'), true);
    const 확인창 = await verify('확인 창이 뜨지 않는다', await 안내창있나(game), false);
    await verify('확인 창 없이 탈퇴해 「아직 길드가 없습니다」가 보인다', 안내 && 확인창, true);
  });
});
