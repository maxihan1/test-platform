import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메인메뉴로나갔다돌아오기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-254',
  name: '채팅을 보낸 뒤 다시 접속하면 채팅 창에 지난 글이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 채팅 창을 열었다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('전체 채팅을 보낸 뒤 「메인 메뉴로」 나가 다시 로그인한다', async () => {
      const 창 = await 채팅창.열기(game);
      await 창.보내기('지난글');
      await 창.띠에뜰때까지('지난글');
      await 창.닫기누르기();
      await 메인메뉴로나갔다돌아오기(game, 아이디, 비밀번호);
      const 새창 = await 채팅창.열기(game);
      await verify('채팅을 보낸 뒤 다시 접속하면 채팅 창에 지난 글이 보이지 않는다', (await 새창.줄원문들()).some((줄) => 줄.includes('지난글')), false);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
