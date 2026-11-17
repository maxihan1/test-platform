import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 초대창모두거절 } from './helpers/social.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-290',
  name: '같은 친구 신청을 두 번 받으면 「받은 친구 신청」에 그 이름 줄이 하나만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 친구 · 파티 창을 열었고 두 번째 플레이어 봇이 접속해 있다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇을 켠 뒤 친구 · 파티 창을 연다', async () => {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 친구파티창.열기(game);
    });
    await test.step('친구 · 파티 창이 열렸는지 확인한다', async () => {
      await verify('친구 · 파티 창이 열려 있다', await 친구파티창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('두 번째 플레이어 봇이 일반 회원에게 친구 신청을 두 번 보낸다', async () => {
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      const 창 = 친구파티창.지금(game);
      const 두장 = await 초대창.두장뜰때까지(game);
      await 창.받은신청줄이뜰때까지(둘째);
      const 줄수 = (await 창.받은신청이름들()).filter((글) => 글.includes(둘째)).length;
      await verify('같은 친구 신청을 두 번 받으면 「받은 친구 신청」에 그 이름 줄이 하나만 보인다', 줄수, 1);
      await verify('두 번째 신청에 「친구 신청」 창이 다시 떠 두 장이 보인다', 두장, true);
    });
  } finally {
    try {
      await 초대창모두거절(game);
    } finally {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
    }
  }
});
