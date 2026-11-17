import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림이없어질때까지, 알림최대개수 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-280',
  name: '알림 4개가 한꺼번에 뜨면 4개가 다 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 상점 창을 열었다'],
  techniques: ['경계값 분석'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 상점 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점창.열기(game);
    });
    await test.step('상점 창이 열렸는지 확인한다', async () => {
      await verify('상점 창이 열려 있다', await 상점창.지금(game).열렸나(), true, { blocker: true });
    });

    await test.step('「조약돌」 「구매」를 빠르게 네 번 누른다', async () => {
      await 상점창.지금(game).구매('조약돌', 4);
      await verify('알림 4개가 한꺼번에 뜨면 4개가 다 보인다', await 알림최대개수(game), 4);
    });
    await test.step('「조약돌」 「구매」를 빠르게 다섯 번 누른다', async () => {
      await verify('앞의 알림이 모두 사라진다', await 알림이없어질때까지(game), true, { blocker: true });
      await 상점창.지금(game).구매('조약돌', 5);
      await verify('다섯 번째 알림이 뜬 뒤에는 오래된 것부터 지워 4개만 보인다', await 알림최대개수(game), 4);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
