import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-191',
  name: '운영 API 로 우편을 보내면 우편함에 제목 · 보낸 사람 · 첨부 줄과 함께 보인다',
  platforms: ['android'],
  precondition: ['운영 API 로 일반 회원에게 우편을 보내 두었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편을 보내 두고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-191', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-FN-191');
      const 제목 = await verify('우편 제목이 보인다', (await 창.목록.이름줄(우편제목('ARG-FN-191'))) !== null, true);
      const 보낸 = await verify('보낸 사람이 보인다', (await 창.줄칸글(우편제목('ARG-FN-191'), 1)) !== '', true);
      const 첨부 = await verify('첨부 줄이 보인다', (await 창.줄칸글(우편제목('ARG-FN-191'), 2)).startsWith('첨부:'), true);
      await verify('운영 API 로 우편을 보내면 우편함에 제목 · 보낸 사람 · 첨부 줄과 함께 보인다', 제목 && 보낸 && 첨부, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
