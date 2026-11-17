import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창닫기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-290',
  name: '같은 친구 신청이 두 번 오면 「친구 신청」 창이 다시 뜨고 「받은 친구 신청」 줄은 하나다',
  held: '보류 — 친구 신청 창이 두 번 겹치면 뒷배경(/Showcase HUD/Invite/Shade)이 둘이라 순번으로도 하나를 고를 수 없다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇을 켠다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('봇이 같은 친구 신청을 두 번 보낸다', async () => {
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      await 초대창.뜰때까지(game, '친구 신청');
      await 초대창닫기(game);
      await 봇시키기(admin, 둘째, `friend_add:${아이디}`);
      const 다시떴다 = await verify('「친구 신청」 창이 다시 뜬다', (await 초대창.뜰때까지(game, '친구 신청')) !== null, true);
      await 초대창닫기(game);
      const 창 = await 친구파티창.열기(game);
      const 한줄 = await verify('「받은 친구 신청」 줄이 하나다', await 창.버튼있는줄수(둘째, '수락'), 1);
      await verify('같은 친구 신청이 두 번 오면 「친구 신청」 창이 다시 뜨고 「받은 친구 신청」 줄은 하나다', 다시떴다 && 한줄, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
