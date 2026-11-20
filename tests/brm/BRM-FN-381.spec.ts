import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 길드미리만들기, 길드초대하기, 로비와봇준비, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-381',
  name: '세 봇을 차례로 초대하고 봇들이 수락하면 길드원이 넷이 되어도 막히지 않고 길드 창 위쪽에 「길드원 4명」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 · 세 · 네 번째 플레이어 봇이 접속해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p4Id: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    p4Password: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  const 봇4 = 계정꺼내기(params.p4Id, params.p4Password, '네 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
    await 계정되돌리기(admin, 봇4);
  });
  await test.step('길드를 만든 일반 회원이 로비에 들어가고 두 · 세 · 네 번째 플레이어 봇이 접속한다', async () => {
    await verify('일반 회원이 길드장이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa381', 들어옴: [] }), true, { blocker: true });
    await 로비와봇준비(game, driver, admin, 나, [봇, 봇3, 봇4]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇3.아이디), true, { blocker: true });
    await verify('네 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇4.아이디), true, { blocker: true });
  });
  await test.step('세 봇을 차례로 초대하고 봇들이 수락한다', async () => {
    for (const 봇글 of [봇, 봇3, 봇4]) {
      await 길드초대하기(game, admin, 나, 봇글);
      await new 공통HUD(game).알림뜸(`${봇글.아이디} 님이 길드에 들어왔습니다`, 15_000);
    }
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 4명');
    await verify('세 봇을 차례로 초대하고 봇들이 수락하면 길드원이 넷이 되어도 막히지 않고 길드 창 위쪽에 「길드원 4명」이 보인다', (await 길드.머리줄())?.includes('길드원 4명') ?? false, true);
  });
});
