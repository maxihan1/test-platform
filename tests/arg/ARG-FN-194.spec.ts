import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편메뉴글될때까지, 우편제목, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-194',
  name: '우편함 창을 한 번 연 뒤 다시 열면 그 우편 제목 앞에 「● 」가 없다',
  platforms: ['android'],
  precondition: ['우편함이 빈 일반 회원에게 첨부 있는 우편 1통을 보내 두었다'],
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
  const 제목 = 우편제목('ARG-FN-194');
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부 있는 우편 1통을 보낸 뒤 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-194', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편메뉴글될때까지(game, '우편 1');
    });
    await test.step('로비 메뉴를 확인한다', async () => {
      await verify('로비 메뉴가 「우편 1」로 보인다', await 로비화면.지금(game).hud.우편메뉴글(), '우편 1', { blocker: true });
    });
    await test.step('우편함 창을 처음 열었다가 닫고 다시 연다', async () => {
      const 처음 = await 우편줄기다리기(game, 'ARG-FN-194');
      await verify('처음 연 우편함 창에서 그 우편 제목 앞에 「● 」가 보인다', await 처음.줄칸글(제목, 0), `● ${제목}`, { blocker: true });
      await 처음.닫기누르기();
      const 다시 = await 우편줄기다리기(game, 'ARG-FN-194');
      await verify('우편함 창을 한 번 연 뒤 다시 열면 그 우편 제목 앞에 「● 」가 없다', await 다시.줄칸글(제목, 0), 제목);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
