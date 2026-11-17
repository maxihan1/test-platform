import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편메뉴글될때까지, 우편메뉴숫자색, 우편받기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편줄수 } from './helpers/mail.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-195',
  name: '첨부를 받은 우편과 첨부가 남은 우편이 하나씩 있으면 메뉴가 「우편 1」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 우편함에 첨부를 받은 우편 1통과 첨부가 남은 우편 1통이 있고 둘 다 읽었다'],
  elements: ['item:health_potion'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부를 받은 우편과 첨부가 남은 우편을 만들어 둘 다 읽는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-195-A', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-195-A');
      await 우편넣기(admin, 아이디, 'ARG-FN-195-B', [{ 이름: '체력 물약', 개수: 1 }]);
      const 처음 = await 우편줄기다리기(game, 'ARG-FN-195-B');
      await 처음.닫기누르기();
      await 우편함창.열기(game);
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함에 우편 줄이 둘 있다', await 우편줄수(우편함창.지금(game)), 2, { blocker: true });
    });
    await test.step('로비에서 메뉴 「우편」 버튼을 확인한다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.닫기누르기();
      await 우편메뉴글될때까지(game, '우편 1', 10_000);
      await verify('첨부를 받은 우편과 첨부가 남은 우편이 하나씩 있으면 메뉴가 「우편 1」로 보인다', await 창.hud.우편메뉴글(), '우편 1');
      await verify('메뉴 「우편」 옆 숫자가 빨간색이다', await 우편메뉴숫자색(game), '빨강');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
