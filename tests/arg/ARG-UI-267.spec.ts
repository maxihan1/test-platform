import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이길드만들기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-267',
  name: '친구 신청을 받으면 화면 가운데 제목 「친구 신청」 창이 뒤를 어둡게 덮고 「수락」 · 「거절」과 함께 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다', '두 번째 플레이어 봇이 길드장인 길드가 있다'],
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
  const 길드이름 = '봇길드267';
  try {
    await test.step('두 번째 플레이어 봇이 길드를 만든다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이길드만들기(admin, 둘째, 길드이름);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('봇이 친구 신청을 보낸다', async () => {
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      const 창 = await 초대창.뜰때까지(game, '친구 신청');
      if (창 === null) throw new Error('친구 신청 창이 뜨지 않았다');
      const 제목 = await verify('창 제목이 「친구 신청」이다', await 창.제목(), '친구 신청');
      const 뒤 = await verify('창 뒤가 어둡게 덮인다', await 창.뒷배경있나(), true);
      const 수락 = await verify('「수락」이 보인다', await 창.수락보이나(), true);
      const 거절 = await verify('「거절」이 보인다', await 창.거절보이나(), true);
      await verify('초대 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      await verify('친구 신청을 받으면 화면 가운데 제목 「친구 신청」 창이 뒤를 어둡게 덮고 「수락」 · 「거절」과 함께 보인다', 제목 && 뒤 && 수락 && 거절, true);
      await 창.거절();
      await 창.닫혔나();
    });
    await test.step('봇이 파티 초대를 보낸다', async () => {
      await 봇시키기(admin, 둘째, `party_invite:${아이디}`);
      const 창 = await 초대창.뜰때까지(game, '파티 초대');
      if (창 === null) throw new Error('파티 초대 창이 뜨지 않았다');
      await verify('파티 초대를 받으면 제목 「파티 초대」 창이 보인다', await 창.제목(), '파티 초대');
      await 창.거절();
      await 창.닫혔나();
    });
    await test.step('봇이 길드 초대를 보낸다', async () => {
      await 봇시키기(admin, 둘째, `guild_invite:${아이디}`);
      const 창 = await 초대창.뜰때까지(game, '길드 초대');
      if (창 === null) throw new Error('길드 초대 창이 뜨지 않았다');
      await verify('길드 초대를 받으면 제목 「길드 초대」 창이 보인다', await 창.제목(), '길드 초대');
      await 창.거절();
      await 창.닫혔나();
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
