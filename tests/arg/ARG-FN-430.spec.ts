import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기, 우편함비우기, 우편메뉴글될때까지 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-430',
  name: '「받기」가 끝나면 우편 줄의 「받기」가 사라지고 메뉴가 「우편」으로 다시 그려진다',
  held: '보류 — 일반 회원 우편함에 받지도 지우지도 못하는 「알 수 없는 아이템」 우편 2통(ARG-FN-202 · ARG-FN-210 이 넣은 것)이 남아 우편 수 · 빈 우편함을 만들 수 없다',
  platforms: ['android'],
  precondition: ['첨부 있는 우편이 1통 있는 일반 회원이 우편함 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편함을 비운 뒤 첨부 있는 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 우편함비우기(game);
      await 우편넣기(admin, 아이디, 'ARG-FN-430', [{ 이름: '체력 물약', 개수: 1 }]);
      await 우편메뉴글될때까지(game, '우편 1');
      await 우편줄기다리기(game, 'ARG-FN-430');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.받기(우편제목('ARG-FN-430'));
      await 우편메뉴글될때까지(game, '우편', 10_000);
      const 줄 = (await 창.목록.이름줄(우편제목('ARG-FN-430'))) ?? '';
      const 받기 = await verify('우편 줄의 「받기」가 사라진다', await 창.목록.줄버튼(줄, '받기'), null);
      const 메뉴 = await verify('메뉴가 「우편」으로 다시 그려진다', await 창.hud.우편메뉴글(), '우편');
      await verify('「받기」가 끝나면 우편 줄의 「받기」가 사라지고 메뉴가 「우편」으로 다시 그려진다', 받기 && 메뉴, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
