import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-061',
  name: '레벨과 골드를 바꾸면 서버에 저장된 캐릭터 레벨이 바뀐 값이다',
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('GM 명령으로 레벨과 골드를 바꾸고 서버 값을 읽는다', async () => {
      await GM(game, '/gm level 5');
      await GM(game, '/gm gold 500');
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 값.level === 5 && 값.골드 === 500);
      await verify('레벨과 골드를 바꾸면 서버에 저장된 캐릭터 레벨이 바뀐 값이다', 서버.level, 5);
      await verify('서버에 저장된 캐릭터 골드가 바뀐 값이다', 서버.골드, 500);
    });
    await test.step('상점에서 「조약돌」을 사고 서버 값을 읽는다', async () => {
      const 상점 = await 상점창.열기(game);
      await 상점.구매('조약돌');
      const 서버 = await 저장될때까지(admin, 아이디, (값) => (값.items['조약돌'] ?? 0) >= 1);
      await verify('서버에 저장된 캐릭터 가방에 산 「조약돌」이 있다', (서버.items['조약돌'] ?? 0) >= 1, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
