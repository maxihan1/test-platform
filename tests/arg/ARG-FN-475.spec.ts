import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 데이터읽기, 아이템표글 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-475',
  name: '서버 데이터에서 갑옷 줄을 읽으면 등급 · 상점가 · 판매가 · 효과가 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:leather_armor', 'item:chain_armor', 'item:dragon_armor'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('GM 명령으로 아이템 데이터를 읽는다', async () => {
      const 줄들 = await 데이터읽기(game, 'item');
      const 값들 = [
        await verify.element('「가죽 갑옷」 줄이 아이템 표와 같다', 'item:leather_armor', 아이템표글(줄들, '가죽 갑옷'), '일반 · 100 · 25 · 받는 피해 −8%'),
        await verify.element('「사슬 갑옷」 줄이 아이템 표와 같다', 'item:chain_armor', 아이템표글(줄들, '사슬 갑옷'), '희귀 · 400 · 100 · 받는 피해 −15%'),
        await verify.element('「용비늘 갑옷」 줄이 아이템 표와 같다', 'item:dragon_armor', 아이템표글(줄들, '용비늘 갑옷'), '전설 · 없음 · 500 · 받는 피해 −25%'),
      ];
      await verify('서버 데이터에서 갑옷 줄을 읽으면 등급 · 상점가 · 판매가 · 효과가 아이템 표와 같다', 값들.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
