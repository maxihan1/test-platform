import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 봇길드만들기, 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-399',
  name: '수락했는데 그사이 다른 길드에 들어갔으면 「이미 길드에 들어가 있습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 · 세 번째 플레이어가 각자 길드장인 길드가 있고 일반 회원은 길드가 없다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    guildA: z.string().describe('두 번째 플레이어 길드 이름 — 2~12자').default('QA길드둘'),
    guildB: z.string().describe('세 번째 플레이어 길드 이름 — 2~12자').default('QA길드셋'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 셋아이디 = params.p3Id ?? '';
  const 셋비밀번호 = params.p3Password ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
  });
  await test.step('세 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
  });

  await test.step('두 번째 · 세 번째 플레이어가 각자 길드를 만든 것을 확인한다', async () => {
    const 둘 = await 봇길드만들기(admin, 둘아이디, params.guildA);
    const 셋 = await 봇길드만들기(admin, 셋아이디, params.guildB);
    await verify('두 봇이 길드를 만들었다', 둘 && 셋, true, { blocker: true });
  });

  await test.step('두 봇이 차례로 초대하고 둘째 초대를 먼저 수락한 뒤 첫째 초대 창 「수락」을 누른다', async () => {
    await 봇시키기(admin, 둘아이디, `guild_invite:${내아이디}`);
    await 초대창.뜰때까지(game);
    await 봇시키기(admin, 셋아이디, `guild_invite:${내아이디}`);
    const 끝 = Date.now() + 15_000;
    while ((await 초대창.길드초대창수(game)) < 2 && Date.now() < 끝) await 초대창.뜰때까지(game, 1_000);
    await verify('길드 초대 창 둘이 쌓여 있다', await 초대창.길드초대창수(game), 2, { blocker: true });
    await 초대창.길드초대수락(game, 1);
    await 초대창.길드초대수락(game, 0);
    await verify('수락했는데 그사이 다른 길드에 들어갔으면 「이미 길드에 들어가 있습니다」가 뜬다', (await 알림글(game, '이미 길드에 들어가 있습니다')) !== null, true);
  });
});
