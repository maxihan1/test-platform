import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-069',
  name: '휴대폰에서 「스킬 1」 버튼을 누르면 탱커의 두 번째 스킬 「방패 오라」를 쓴다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['class:tank', 'skill:shield_aura'],
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
      await verify('던전에 「스킬 1」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.스킬1), true, { blocker: true });
    });

    await test.step('「스킬 1」 버튼을 누른다', async () => {
      await 던전화면.지금(game).누르기(던전화면.스킬1);
      const 상태 = await 상태읽기(game, true);
      await verify('휴대폰에서 「스킬 1」 버튼을 누르면 탱커의 두 번째 스킬 「방패 오라」를 쓴다', 상태['쓴스킬'], '방패 오라');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
