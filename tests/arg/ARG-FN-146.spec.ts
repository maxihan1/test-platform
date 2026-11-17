import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 알림없어질때까지, 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-146',
  name: '장착 칸의 「해제」를 누르면 장비가 가방 목록으로 돌아오고 알림이 뜨지 않는다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 낀 일반 회원이 가방 창을 열었다'],
  elements: ['item:rusty_dagger'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 끼고 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-146', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-146');
      await 가방에서장착(game, '녹슨 단검');
      await 알림없어질때까지(game);
      await 가방창.열기(game);
    });
    await test.step('장착 칸을 확인한다', async () => {
      await verify('무기 칸에 「녹슨 단검」이 보인다', (await 가방창.지금(game).장착칸글('무기')).includes('녹슨 단검'), true, { blocker: true });
    });
    await test.step('무기 칸의 「해제」를 누른다', async () => {
      const 가방 = 가방창.지금(game);
      await 가방.해제누르기('무기');
      await 조건될때까지(async () => (await 가방.목록.이름줄('녹슨 단검')) !== null);
      const 돌아옴 = await verify('장비가 가방 목록으로 돌아온다', (await 가방.목록.이름줄('녹슨 단검')) !== null, true);
      const 조용 = await verify('알림이 뜨지 않는다', await 가방.hud.알림글들(), []);
      await verify('장착 칸의 「해제」를 누르면 장비가 가방 목록으로 돌아오고 알림이 뜨지 않는다', 돌아옴 && 조용, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
