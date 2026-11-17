import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창닫기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-286',
  name: '받은 친구 신청 줄의 「수락」을 누르면 친구가 된다',
  held: '보류 — 친구 · 파티 창 제목이 10초 안에 뜨지 않았습니다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 일반 회원에게 친구 신청을 보냈다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇이 친구 신청을 보내게 한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
    });
    await test.step('친구 신청 창이 떴는지 확인한다', async () => {
      await verify('「친구 신청」 창이 보인다', (await 초대창.뜰때까지(game, '친구 신청')) !== null, true, { blocker: true });
    });
    await test.step('초대 창을 닫고 친구 · 파티 창 「받은 친구 신청」의 「수락」을 누른다', async () => {
      await 초대창닫기(game);
      const 창 = await 친구파티창.열기(game);
      await 창.줄에서버튼누르기(둘째, '수락');
      const 알림 = await verify('「qa_player2 님과 친구가 되었습니다」가 뜬다', await 토스트떴나(game, `${둘째} 님과 친구가 되었습니다`), true);
      const 새창 = await 친구파티창.다시열기(game);
      const 목록 = await verify('일반 회원의 친구 목록에 두 번째 플레이어가 보인다', (await 새창.줄글들()).some((줄) => 줄.includes(둘째)), true);
      await verify('받은 친구 신청 줄의 「수락」을 누르면 친구가 된다', 알림 && 목록, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
