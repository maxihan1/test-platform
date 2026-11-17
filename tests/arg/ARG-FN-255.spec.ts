import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내가봇을파티에초대해수락시키기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-255',
  name: '「파티」 탭을 고르면 파티 줄과 알림 줄만 보이고 전체 줄은 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 같은 파티다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 파티를 맺는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('전체 채팅과 파티 채팅을 하나씩 받은 뒤 「파티」 탭을 누른다', async () => {
      const 창 = await 채팅창.열기(game);
      await 봇시키기(admin, 둘째, 'say:탭전체글');
      await 창.띠에뜰때까지('탭전체글');
      await 봇시키기(admin, 둘째, 'psay:탭파티글');
      await 창.띠에뜰때까지('탭파티글');
      await 창.탭누르기('파티');
      const 줄들 = await 창.줄글들();
      const 파티줄 = await verify('파티 줄이 보인다', 줄들.some((줄) => 줄.includes('탭파티글')), true);
      const 전체줄 = await verify('전체 줄이 보이지 않는다', 줄들.some((줄) => 줄.includes('탭전체글')), false);
      const 둘뿐 = await verify('파티 줄과 알림 줄만 보인다', 줄들.every((줄) => 줄.startsWith('[파티]') || 줄.startsWith('[알림]')), true);
      await verify('「파티」 탭을 고르면 파티 줄과 알림 줄만 보이고 전체 줄은 보이지 않는다', 파티줄 && 전체줄 && 둘뿐, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
