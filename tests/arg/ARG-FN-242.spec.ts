import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내가봇을파티에초대해수락시키기, 봇이길드만들기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-242',
  name: '다른 사람이 전체 채팅을 보내면 내 채팅 창 「전체」 탭에 그 글이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다', '일반 회원과 두 번째 플레이어 봇이 같은 파티다', '두 번째 플레이어 봇이 길드에 있고 일반 회원은 길드가 없다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 봇이 길드를 만든 뒤 파티를 맺는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이길드만들기(admin, 둘째, '봇길드242');
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('봇이 전체 채팅을 보낸다', async () => {
      const 창 = await 채팅창.열기(game);
      await 봇시키기(admin, 둘째, 'say:봇전체글');
      await 창.띠에뜰때까지('봇전체글');
      await verify('다른 사람이 전체 채팅을 보내면 내 채팅 창 「전체」 탭에 그 글이 보인다', (await 창.줄원문들()).some((줄) => 줄.includes('봇전체글')), true);
    });
    await test.step('봇이 파티 채팅을 보낸다', async () => {
      const 창 = 채팅창.지금(game);
      await 봇시키기(admin, 둘째, 'psay:봇파티글');
      await 창.띠에뜰때까지('봇파티글');
      await 창.탭누르기('파티');
      await verify('같은 파티원이 보낸 파티 채팅이 「파티」 탭에 보인다', (await 창.줄원문들()).some((줄) => 줄.includes('봇파티글')), true);
    });
    await test.step('봇이 길드 채팅을 보낸다', async () => {
      const 창 = 채팅창.지금(game);
      await 봇시키기(admin, 둘째, 'gsay:봇길드글');
      await 봇시키기(admin, 둘째, 'say:봇마침글');
      await 창.탭누르기('전체');
      await 창.띠에뜰때까지('봇마침글');
      const 전체탭에없다 = await verify('「전체」 탭에 길드 채팅이 보이지 않는다', (await 창.줄원문들()).some((줄) => 줄.includes('봇길드글')), false);
      await 창.탭누르기('길드');
      const 길드탭에없다 = await verify('「길드」 탭에 길드 채팅이 보이지 않는다', (await 창.줄원문들()).some((줄) => 줄.includes('봇길드글')), false);
      await verify('길드원이 아닌 내게는 다른 사람의 길드 채팅이 보이지 않는다', 전체탭에없다 && 길드탭에없다, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
