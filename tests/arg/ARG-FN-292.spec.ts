import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이친구신청해수락하기, 팝업떠있나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇로그, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-292',
  name: '친구 줄의 「삭제」를 누르면 확인 창 없이 내 목록에서 그 친구가 빠진다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어가 친구이고 일반 회원이 친구 · 파티 창을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  try {
    await test.step('일반 회원과 두 번째 플레이어를 친구로 만들고 친구 · 파티 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이친구신청해수락하기(game, admin, 둘째, 아이디);
      await 친구파티창.다시열기(game);
    });
    await test.step('두 번째 플레이어와 친구인지 확인한다', async () => {
      await verify('친구 목록에 두 번째 플레이어가 보인다', (await 친구파티창.지금(game).줄글들()).some((줄) => 줄.includes(둘째)), true, { blocker: true });
    });
    await test.step('친구 줄의 「삭제」를 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.줄에서버튼누르기(둘째, '삭제');
      const 확인창없음 = await verify('확인 창이 뜨지 않는다', await 팝업떠있나(game), false);
      const 빠졌다 = await verify('내 목록에서 그 친구가 빠진다', await 창.줄이사라질때까지(둘째), true);
      await verify('친구 줄의 「삭제」를 누르면 확인 창 없이 내 목록에서 그 친구가 빠진다', 확인창없음 && 빠졌다, true);
      await 봇로그(admin, 둘째, true);
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      await verify('상대 목록에서도 내가 빠진다', (await 초대창.뜰때까지(game, '친구 신청')) !== null, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
