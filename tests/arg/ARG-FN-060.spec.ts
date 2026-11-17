import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 실패걸기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-060',
  name: '저장에 실패하면 다음 10초 주기에 다시 저장해 서버에 바뀐 골드가 남는다',
  platforms: ['android'],
  precondition: ['다음 캐릭터 저장 요청이 실패하도록 걸어 두었다'],
  techniques: ['동등 분할', '상태 전이'],
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

    await test.step('저장이 실패하는 때에 골드를 바꾸고 25초 동안 서버 값을 읽는다', async () => {
      await 실패걸기(admin, '/api/saveplayercharacter');
      await GM(game, '/gm gold 500');
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 값.골드 === 500, 25_000);
      await verify('저장에 실패하면 다음 10초 주기에 다시 저장해 서버에 바뀐 골드가 남는다', 서버.골드, 500);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
