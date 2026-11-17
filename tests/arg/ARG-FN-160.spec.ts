import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-160',
  name: '아이템 표에 없는 이름의 아이템을 받으면 가방에 그 이름 그대로 들어오고 설명이 「알 수 없는 아이템」이다',
  platforms: ['android'],
  precondition: ['일반 회원에게 「QA 수상한 돌」을 첨부한 우편을 보내 두었다'],
  techniques: ['동등 분할'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「QA 수상한 돌」 우편을 보내 두고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-160', [{ 이름: 'QA 수상한 돌', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편 첨부를 받고 가방 창을 연다', async () => {
      await 우편받기(game, 'ARG-FN-160');
      const 가방 = await 가방창.열기(game);
      const 들어옴 = await verify('가방에 「QA 수상한 돌」이 그 이름 그대로 들어온다', (await 가방.목록.이름줄('QA 수상한 돌')) !== null, true);
      const 설명 = await verify('설명이 「알 수 없는 아이템」이다', await 가방.줄칸글('QA 수상한 돌', 1), '알 수 없는 아이템');
      await verify('아이템 표에 없는 이름의 아이템을 받으면 가방에 그 이름 그대로 들어오고 설명이 「알 수 없는 아이템」이다', 들어옴 && 설명, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
