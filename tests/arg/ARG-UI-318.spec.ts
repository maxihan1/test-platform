import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-318',
  name: '장비를 끼지 않은 가방 창 장착 칸에 「비어 있음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '「녹슨 단검」을 낀 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 받는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-UI-318', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-UI-318');
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('가방 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      const 무기 = await verify('무기 칸에 「비어 있음」이 보인다', await 가방.장착칸글('무기'), '비어 있음');
      const 갑옷 = await verify('갑옷 칸에 「비어 있음」이 보인다', await 가방.장착칸글('갑옷'), '비어 있음');
      const 장신구 = await verify('장신구 칸에 「비어 있음」이 보인다', await 가방.장착칸글('장신구'), '비어 있음');
      await verify('장비를 끼지 않은 가방 창 장착 칸에 「비어 있음」이 보인다', 무기 && 갑옷 && 장신구, true);
    });
    await test.step('「녹슨 단검」을 장착한다', async () => {
      await 가방창.지금(game).닫기누르기();
      await 가방에서장착(game, '녹슨 단검');
      await 가방창.열기(game);
    });
    await test.step('「녹슨 단검」을 낀 채 가방 창을 연다', async () => {
      const 가방 = 가방창.지금(game);
      const 이름 = await verify('무기 칸에 「녹슨 단검」이 보인다', (await 가방.장착칸글('무기')).includes('녹슨 단검'), true);
      const 설명 = await verify('무기 칸에 설명이 보인다', (await 가방.장착칸설명글('무기')) !== '', true);
      const 해제 = await verify('무기 칸에 「해제」가 보인다', await 가방.해제버튼있나('무기'), true);
      await verify('장착한 무기 칸에는 「녹슨 단검」 · 설명 · 「해제」가 보인다', 이름 && 설명 && 해제, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
