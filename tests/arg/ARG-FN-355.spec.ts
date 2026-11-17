import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-355',
  name: '가방 창이 열린 채 초대 창이 뜨면 가방 창이 그대로 열려 있다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 접속해 있고 일반 회원이 가방 창을 열었다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇을 켠 뒤 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 가방창.열기(game);
    });
    await test.step('가방 창이 열렸는지 확인한다', async () => {
      await verify('가방 창이 열려 있다', await 가방창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('봇이 친구 신청을 보낸다', async () => {
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      await 초대창.뜰때까지(game, '친구 신청');
      await verify('가방 창이 열린 채 초대 창이 뜨면 가방 창이 그대로 열려 있다', await 가방창.지금(game).열렸나(), true);
    });
    await test.step('초대 창의 「거절」을 누른다', async () => {
      const 창 = await 초대창.뜰때까지(game, '친구 신청');
      if (창 === null) throw new Error('친구 신청 창이 사라졌다');
      await 창.거절();
      await verify('초대 창은 「거절」을 눌러도 닫힌다', await 창.닫혔나(), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
