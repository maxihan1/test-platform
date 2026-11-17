import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇로그, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 봇이볼때까지, 초대창모두거절 } from './helpers/social.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-286',
  name: '친구 신청을 받으면 친구 · 파티 창 맨 위 「받은 친구 신청」 아래에 신청한 사람 이름 줄이 보인다',
  platforms: ['android'],
  precondition: [
    '일반 회원이 로비에서 친구 · 파티 창을 열었고 두 번째 플레이어 봇이 접속해 있다',
    '일반 회원이 로비에서 친구 · 파티 창을 열었고 두 번째 플레이어 봇이 친구 신청을 보냈다',
    '일반 회원이 로비에서 친구 · 파티 창을 열었고 세 번째 플레이어 봇이 친구 신청을 보냈다',
  ],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    thirdId: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    thirdPassword: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 셋째 = params.thirdId ?? '';
  const 셋째비밀번호 = params.thirdPassword ?? '';
  try {
    await test.step('일반 회원과 두 번째 · 세 번째 플레이어 계정을 처음 상태로 되돌리고 봇을 켠 뒤 친구 · 파티 창을 연다', async () => {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 계정되돌리기(admin, 셋째, 셋째비밀번호, 'base');
      await 봇켜기(admin, { user: 셋째, pass: 셋째비밀번호 });
      await 친구파티창.열기(game);
    });
    await test.step('친구 · 파티 창이 열렸는지 확인한다', async () => {
      await verify('친구 · 파티 창이 열려 있다', await 친구파티창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('두 번째 플레이어 봇이 일반 회원에게 친구 신청을 보낸다', async () => {
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      await verify(
        '친구 신청을 받으면 친구 · 파티 창 맨 위 「받은 친구 신청」 아래에 신청한 사람 이름 줄이 보인다',
        await 친구파티창.지금(game).받은신청줄이뜰때까지(둘째),
        true,
      );
    });
    await test.step('「받은 친구 신청」 줄의 「수락」을 누른다', async () => {
      const 창 = 친구파티창.지금(game);
      await 창.줄버튼누르기(둘째, '수락');
      await verify('친구 목록에 수락한 신청의 사람이 보인다', await 창.친구목록에뜰때까지(둘째), true);
    });
    await test.step('세 번째 플레이어 봇이 일반 회원에게 친구 신청을 보낸다', async () => {
      await 봇시키기(admin, 셋째, `friend_add:${아이디}`);
      await verify('「받은 친구 신청」에 세 번째 플레이어 줄이 보인다', await 친구파티창.지금(game).받은신청줄이뜰때까지(셋째), true, { blocker: true });
    });
    await test.step('「받은 친구 신청」 줄의 「거절」을 누른다', async () => {
      await 봇로그(admin, 셋째, true);
      await 친구파티창.지금(game).줄버튼누르기(셋째, '거절');
      await verify(
        '거절한 신청을 보낸 쪽에 「<이름> 님이 친구 신청을 거절했습니다」가 뜬다',
        await 봇이볼때까지(admin, 셋째, `${아이디} 님이 친구 신청을 거절했습니다`),
        true,
      );
    });
  } finally {
    try {
      await 초대창모두거절(game);
    } finally {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 계정되돌리기(admin, 셋째, 셋째비밀번호, 'base');
    }
  }
});
