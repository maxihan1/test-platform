import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-098',
  name: '스위치를 밟아 문이 열리면 알림 줄에 「문이 열렸습니다!」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['zone:Dungeon'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('GM 명령으로 바닥 스위치 위로 간다', async () => {
      await GM(game, '/gm tp switch');
      await verify('스위치를 밟아 문이 열리면 알림 줄에 「문이 열렸습니다!」가 뜬다', await 던전화면.지금(game).hud.알림기다리기('문이 열렸습니다!', 15_000), true);
    });

    await test.step('GM 명령으로 스위치에서 보스 방으로 옮긴다', async () => {
      await GM(game, '/gm tp boss');
      await verify('스위치를 떠난 뒤 알림 줄에 「문이 닫힙니다」가 뜬다', await 던전화면.지금(game).hud.알림기다리기('문이 닫힙니다', 15_000), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
