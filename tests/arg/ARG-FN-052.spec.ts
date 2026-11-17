import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 저장될때까지, 캐릭터 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-052',
  name: '바뀐 내용이 없으면 15초가 지나도 서버의 저장 시각이 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  techniques: ['상태 전이'],
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

    await test.step('아무것도 바꾸지 않고 15초 동안 저장 시각을 읽는다', async () => {
      const 처음 = (await 캐릭터(admin, 아이디)).savedOn;
      const 뒤 = await 저장될때까지(admin, 아이디, (값) => 값.savedOn !== 처음, 15_000);
      await verify('바뀐 내용이 없으면 15초가 지나도 서버의 저장 시각이 그대로다', 뒤.savedOn, 처음);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
