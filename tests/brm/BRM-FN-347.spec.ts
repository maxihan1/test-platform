import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 봇이받음, 접속중인가, 친구미리맺기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-347',
  name: '이름 칸으로 「파티 초대」를 누르면 봇에게 파티 초대가 간다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다', '일반 회원과 접속 중인 두 번째 플레이어 봇이 친구다'],
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
  await test.step('두 번째 플레이어 봇과 친구를 맺고 일반 회원으로 로비에 들어간다', async () => {
    await verify('일반 회원과 접속 중인 두 번째 플레이어 봇이 친구다', await 친구미리맺기(admin, 나, [{ 계정: 봇 }]), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
  });
  await test.step('「캐릭터 이름」 칸에 「qa_player2」를 넣고 「파티 초대」를 누른다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    const 창 = await 친구파티창.열기(game);
    await 창.이름넣기(봇.아이디);
    await 창.파티초대누르기();
    await verify('이름 칸으로 「파티 초대」를 누르면 봇에게 파티 초대가 간다', await 봇이받음(admin, 봇.아이디, 'invite', 나.아이디), true);
    await 봇시키기(admin, 봇.아이디, `party_decline:${나.아이디}`);
  });
  await test.step('친구 줄의 「파티 초대」를 누른다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    const 창 = await 친구파티창.열기(game);
    await 창.글줄뜸(봇.아이디);
    const 줄 = await 창.친구줄번호(봇.아이디);
    await 창.줄버튼누르기(줄 ?? 0, '파티 초대');
    await verify('봇에게 파티 초대가 간다', await 봇이받음(admin, 봇.아이디, 'invite', 나.아이디), true);
  });
});
