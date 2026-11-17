import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 봇이다른봇을초대해수락시키기, 초대창모두거절, 토스트떴나 } from './helpers/social.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-479',
  name: '초대를 수락했는데 그사이 파티가 4명이 됐으면 「파티 인원이 가득 찼습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 세 번째 · 네 번째 플레이어와 3명 파티를 꾸리고 일반 회원을 파티에 초대했다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    thirdId: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    thirdPassword: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    fourthId: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    fourthPassword: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
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
  const 넷째 = params.fourthId ?? '';
  const 넷째비밀번호 = params.fourthPassword ?? '';
  const 새 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';
  try {
    await test.step('두 번째 · 세 번째 · 네 번째 플레이어와 새 계정 봇을 켜고 두 번째 플레이어 봇이 3명 파티를 꾸린 뒤 일반 회원을 초대한다', async () => {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 계정되돌리기(admin, 셋째, 셋째비밀번호, 'base');
      await 봇켜기(admin, { user: 셋째, pass: 셋째비밀번호 });
      await 계정되돌리기(admin, 넷째, 넷째비밀번호, 'base');
      await 봇켜기(admin, { user: 넷째, pass: 넷째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 봇이다른봇을초대해수락시키기(admin, 'party', 둘째, 셋째);
      await 봇이다른봇을초대해수락시키기(admin, 'party', 둘째, 넷째);
      await 봇시키기(admin, 둘째, `party_invite:${아이디}`);
    });
    await test.step('「파티 초대」 창이 떴는지 확인한다', async () => {
      await verify('「파티 초대」 창이 보인다', (await 초대창.뜰때까지(game, '파티 초대')) !== null, true, { blocker: true });
    });
    await test.step('새 계정 봇이 넷째로 들어온 뒤 「파티 초대」 창의 「수락」을 누른다', async () => {
      await 봇이다른봇을초대해수락시키기(admin, 'party', 둘째, 새);
      const 초대 = await 초대창.뜰때까지(game, '파티 초대');
      if (초대 === null) throw new Error('파티 초대 창이 사라졌다');
      await 초대.수락();
      await verify('초대를 수락했는데 그사이 파티가 4명이 됐으면 「파티 인원이 가득 찼습니다」가 뜬다', await 토스트떴나(game, '파티 인원이 가득 찼습니다'), true);
    });
  } finally {
    try {
      await 초대창모두거절(game);
    } finally {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 계정되돌리기(admin, 셋째, 셋째비밀번호, 'base');
      await 계정되돌리기(admin, 넷째, 넷째비밀번호, 'base');
    }
  }
});
