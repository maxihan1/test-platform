import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내가봇을파티에초대해수락시키기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-238',
  name: '2명 파티면 친구 · 파티 창 파티 머리줄에 「파티 2/4 · 경험치 +10%」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 같은 파티다', '일반 회원이 파티가 없다'],
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
    await test.step('일반 회원이 두 번째 플레이어 봇과 둘이서 파티를 맺는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('친구 · 파티 창을 연다', async () => {
      const 창 = await 친구파티창.다시열기(game);
      await verify('2명 파티면 친구 · 파티 창 파티 머리줄에 「파티 2/4 · 경험치 +10%」가 보인다', (await 창.줄글들()).some((줄) => 줄.includes('파티 2/4 · 경험치 +10%')), true);
      await 봇시키기(admin, 둘째, 'party_leave');
      await 토스트떴나(game, '파티가 해산되었습니다');
      const 새창 = await 친구파티창.다시열기(game);
      await verify('파티가 없으면 파티 머리줄에 「파티 없음」이 보인다', (await 새창.줄글들()).some((줄) => 줄.includes('파티 없음')), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
