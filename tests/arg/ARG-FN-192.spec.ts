import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-192',
  name: '우편이 두 통이면 나중에 온 우편이 위에 보인다',
  platforms: ['android'],
  precondition: ['운영 API 로 일반 회원에게 우편 두 통을 차례로 보내 두었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편 두 통을 차례로 보내 두고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-192 첫째');
      await 우편넣기(admin, 아이디, 'ARG-FN-192 둘째');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-FN-192 둘째');
      const 제목들 = (await 창.목록.첫칸들()).map((글) => 글.replace(/^● /, '')).filter((글) => 글.includes('ARG-FN-192'));
      await verify('우편이 두 통이면 나중에 온 우편이 위에 보인다', 제목들.join(' / '), '[QA] ARG-FN-192 둘째 / [QA] ARG-FN-192 첫째');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
