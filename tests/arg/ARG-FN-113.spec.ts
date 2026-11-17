import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { GM하고알림들읽기 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-113',
  name: '레벨이 오르면 「레벨 업! Lv.2」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:2'],
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

    await test.step('GM 명령으로 경험치 100 을 준다', async () => {
      const [큰글, 알림] = await GM하고알림들읽기(game, '/gm exp 100', [로비화면.레벨업큰글, 로비화면.레벨업알림]);
      const 금색 = await verify('화면 가운데 「레벨 업!」 글자가 금색이다', 큰글?.색 ?? '', '금색');
      await verify('레벨이 오르면 「레벨 업! Lv.2」 알림이 뜬다', 알림?.떴나 ?? false, true);
      const 떴다 = await verify('화면 가운데에 「레벨 업!」이 뜬다', 큰글?.떴나 ?? false, true);
      await verify('화면 가운데에 큰 금색 「레벨 업!」이 뜬다', 금색 && 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
