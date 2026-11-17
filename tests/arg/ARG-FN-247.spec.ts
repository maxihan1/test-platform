import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 내가봇을파티에초대해수락시키기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-247',
  name: '전체 채팅을 보내면 그 줄이 밝은 베이지 #F2ECE0 으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 채팅 창을 열었다', '일반 회원과 두 번째 플레이어 봇이 같은 파티다', '일반 회원이 길드장인 길드가 있다'],
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
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 파티와 길드를 만든 뒤 채팅 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, '색길드247');
      await 채팅창.열기(game);
    });
    await test.step('채팅 창이 열렸는지 확인한다', async () => {
      await verify('채팅 창에 입력 칸이 보인다', await 채팅창.지금(game).보이나(채팅창.입력칸), true, { blocker: true });
    });
    await test.step('전체 채팅을 보내고 줄 색을 읽는다', async () => {
      const 창 = 채팅창.지금(game);
      await 창.탭누르기('전체');
      await 창.보내기('색확인전체');
      await 창.띠에뜰때까지('색확인전체');
      await verify('전체 채팅을 보내면 그 줄이 밝은 베이지 #F2ECE0 으로 보인다', await 창.줄색('색확인전체'), '#F2ECE0');
    });
    await test.step('접속 알림 줄 색을 읽는다', async () => {
      const 창 = 채팅창.지금(game);
      await verify('알림 줄은 금색 #FFD152 다', await 창.줄색('[알림]'), '#FFD152');
    });
    await test.step('파티 채팅을 보내고 줄 색을 읽는다', async () => {
      const 창 = 채팅창.지금(game);
      await 창.탭누르기('파티');
      await 창.보내기('색확인파티');
      await 창.띠에뜰때까지('색확인파티');
      await verify('파티 줄은 하늘색 #7FD7FF 다', await 창.줄색('색확인파티'), '#7FD7FF');
    });
    await test.step('길드 채팅을 보내고 줄 색을 읽는다', async () => {
      const 창 = 채팅창.지금(game);
      await 창.탭누르기('길드');
      await 창.보내기('색확인길드');
      await 창.띠에뜰때까지('색확인길드');
      await verify('길드 줄은 연두 #9BE37B 다', await 창.줄색('색확인길드'), '#9BE37B');
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
