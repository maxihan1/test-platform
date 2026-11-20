import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비와봇준비, 봇이받음, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-382',
  name: '길드장이 「초대」를 누르면 봇에게 길드 초대가 간다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 번째 플레이어 봇이 접속해 있다'],
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
  await test.step('길드를 만든 일반 회원이 로비에 들어가고 두 번째 플레이어 봇이 접속한다', async () => {
    await verify('일반 회원이 길드장이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa382', 들어옴: [] }), true, { blocker: true });
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
  });
  await test.step('「초대할 캐릭터 이름」 칸에 「qa_player2」를 넣고 「초대」를 누른다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    const 길드 = await 길드창.열기(game);
    await 길드.초대하기(봇.아이디);
    await verify('길드장이 「초대」를 누르면 봇에게 길드 초대가 간다', await 봇이받음(admin, 봇.아이디, 'invite', 나.아이디), true);
  });
});
