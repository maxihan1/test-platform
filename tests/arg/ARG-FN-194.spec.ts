import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편줄기다리기, 우편함비우기, 우편메뉴글될때까지 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-194',
  name: '우편함 창을 열어 목록에 보이면 안 읽은 우편이 읽음으로 바뀌어 메뉴가 「우편」이 된다',
  held: '보류 — 일반 회원 우편함에 받지도 지우지도 못하는 「알 수 없는 아이템」 우편 2통(ARG-FN-202 · ARG-FN-210 이 넣은 것)이 남아 우편 수 · 빈 우편함을 만들 수 없다',
  platforms: ['android'],
  precondition: ['첨부 없는 안 읽은 우편이 있는 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편함을 비운 뒤 첨부 없는 우편을 받는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 우편함비우기(game);
      await 우편넣기(admin, 아이디, 'ARG-FN-194');
      await 우편메뉴글될때까지(game, '우편 1');
    });
    await test.step('우편 메뉴를 확인한다', async () => {
      await verify('메뉴가 「우편 1」로 보인다', await 로비화면.지금(game).hud.우편메뉴글(), '우편 1', { blocker: true });
    });
    await test.step('우편함 창을 열었다가 닫는다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-FN-194');
      await 창.닫기누르기();
      await 우편메뉴글될때까지(game, '우편', 10_000);
      await verify('우편함 창을 열어 목록에 보이면 안 읽은 우편이 읽음으로 바뀌어 메뉴가 「우편」이 된다', await 로비화면.지금(game).hud.우편메뉴글(), '우편');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
