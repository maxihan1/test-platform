import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창 } from './components/invite.component.js';
import { 로비준비, 친구미리맺기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-335',
  name: '친구 줄의 「삭제」를 누르면 내 친구 목록에서 「qa_player2」가 빠진다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 친구다', '일반 회원과 두 번째 플레이어 봇이 친구다'],
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
    await verify('일반 회원과 두 번째 플레이어 봇이 친구다', await 친구미리맺기(admin, 나, [{ 계정: 봇 }]), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('친구 줄의 「삭제」를 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.글줄뜸(봇.아이디);
    const 줄 = await 창.친구줄번호(봇.아이디);
    await 창.줄버튼누르기(줄 ?? 0, '삭제');
    await verify('친구 줄의 「삭제」를 누르면 내 친구 목록에서 「qa_player2」가 빠진다', await 창.글줄사라질때까지(봇.아이디), true);
  });
  await test.step('친구 줄의 「삭제」 뒤 봇에게 다시 친구 신청을 시킨다', async () => {
    await 봇시키기(admin, 봇.아이디, `friend_add:${나.아이디}`);
    await verify('봇 목록에서도 빠져 있어 「친구 신청」 창이 뜬다', await new 초대창(game).뜰때까지('친구 신청'), true);
  });
});
