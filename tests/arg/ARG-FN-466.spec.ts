import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-466',
  name: '초대한 사람이 나간 뒤 수락하면 「초대한 사람이 나갔습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 일반 회원을 파티에 초대했다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇이 파티에 초대하게 한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇시키기(admin, 둘째, `party_invite:${아이디}`);
    });
    await test.step('파티 초대 창이 떴는지 확인한다', async () => {
      await verify('「파티 초대」 창이 보인다', (await 초대창.뜰때까지(game, '파티 초대')) !== null, true, { blocker: true });
    });
    await test.step('봇의 접속을 끊은 뒤 「수락」을 누른다', async () => {
      await 봇끄기(admin, 둘째);
      const 창 = await 초대창.뜰때까지(game, '파티 초대');
      if (창 === null) throw new Error('파티 초대 창이 사라졌다');
      await 창.수락();
      await verify('초대한 사람이 나간 뒤 수락하면 「초대한 사람이 나갔습니다」가 뜬다', await 토스트떴나(game, '초대한 사람이 나갔습니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
