import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 봇을파티에넣기, 토스트떴나 } from './helpers/social.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-302',
  name: '3명 파티에 넷째를 초대해 수락하면 친구 · 파티 창 파티 머리줄이 「파티 4/4」로 시작한다',
  platforms: ['android'],
  precondition: [
    '일반 회원이 두 번째 · 세 번째 플레이어와 3명 파티의 파티장이다',
    '일반 회원이 두 번째 · 세 번째 · 네 번째 플레이어와 4명 파티의 파티장이다',
  ],
  techniques: ['경계값 분석'],
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
    await test.step('두 번째 · 세 번째 · 네 번째 플레이어와 새 계정 봇을 켜고 두 번째 · 세 번째 플레이어를 파티에 초대해 수락시킨다', async () => {
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
      await 봇을파티에넣기(game, admin, 둘째, 2);
      await 봇을파티에넣기(game, admin, 셋째, 3);
    });
    await test.step('파티가 3명인지 확인한다', async () => {
      const 창 = await 친구파티창.다시열기(game);
      await verify('파티 머리줄이 「파티 3/4」로 시작한다', (await 창.파티머리줄()).startsWith('파티 3/4'), true, { blocker: true });
    });
    await test.step('네 번째 플레이어를 파티에 초대해 수락시킨다', async () => {
      await 봇을파티에넣기(game, admin, 넷째, 4);
      const 창 = await 친구파티창.다시열기(game);
      await verify(
        '3명 파티에 넷째를 초대해 수락하면 친구 · 파티 창 파티 머리줄이 「파티 4/4」로 시작한다',
        (await 창.파티머리줄()).startsWith('파티 4/4'),
        true,
        { blocker: true },
      );
    });
    await test.step('새 계정 봇을 파티에 초대한다', async () => {
      const 창 = await 친구파티창.열기(game);
      await 창.파티초대하기(새);
      await verify('4명 파티에서 다섯째 초대에 「파티는 최대 4명입니다」가 뜬다', await 토스트떴나(game, '파티는 최대 4명입니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
    await 계정되돌리기(admin, 셋째, 셋째비밀번호, 'base');
    await 계정되돌리기(admin, 넷째, 넷째비밀번호, 'base');
  }
});
