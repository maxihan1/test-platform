import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 초대창 } from './components/invite.component.js';
import { 로비준비, 봇길드만들기, 봇들켜기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇기록기다리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-634',
  name: '길드가 없어진 뒤 수락하면 「초대한 길드를 찾지 못했습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 혼자인 길드의 길드장이고 일반 회원을 초대했다'],
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
  await test.step('두 번째 플레이어 봇이 길드를 만들고 일반 회원을 초대하게 한다', async () => {
    await 봇들켜기(admin, [봇]);
    const 만듦 = await 봇길드만들기(admin, 봇, 'qa634');
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await 봇시키기(admin, 봇.아이디, `guild_invite:${나.아이디}`);
    await verify('두 번째 플레이어 봇이 혼자인 길드의 길드장이고 일반 회원을 초대했다', 만듦 && (await new 초대창(game).뜰때까지('길드 초대')), true, { blocker: true });
  });
  await test.step('봇이 「길드 탈퇴」로 길드를 없앤 뒤 「길드 초대」 창의 「수락」을 누른다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    await 봇시키기(admin, 봇.아이디, 'guild_leave');
    await 봇기록기다리기(admin, 봇.아이디, (줄) => 줄.type === 'toast', 10_000);
    await new 초대창(game).수락('길드 초대');
    await verify('길드가 없어진 뒤 수락하면 「초대한 길드를 찾지 못했습니다」가 뜬다', await new 공통HUD(game).알림뜸('초대한 길드를 찾지 못했습니다'), true);
  });
});
