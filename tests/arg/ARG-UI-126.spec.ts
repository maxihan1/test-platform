import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-126',
  name: '상점 창에 「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「가죽 갑옷」 · 「사슬 갑옷」 · 「행운의 반지」 · 「현자의 목걸이」 · 「체력 물약」 · 「조약돌」 9종만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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
    await test.step('상점 창을 연다', async () => {
      const 상점 = await 상점창.열기(game);
      const 이름들 = await 상점.목록.첫칸들();
      await verify('상점 창에 「녹슨 단검」 · 「강철 롱소드」 · 「룬 새김 도끼」 · 「가죽 갑옷」 · 「사슬 갑옷」 · 「행운의 반지」 · 「현자의 목걸이」 · 「체력 물약」 · 「조약돌」 9종만 보인다', 이름들.join(' · '), '녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약 · 조약돌');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
