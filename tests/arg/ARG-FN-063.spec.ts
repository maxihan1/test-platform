import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 줄값 } from './helpers/battle.helper.js';
import { 계정되돌리기, 데이터읽기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-063',
  name: '직업 데이터를 읽으면 직업마다 기본 체력이 직업 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['class:tank', 'class:archer', 'class:mage', 'class:rogue'],
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

    await test.step('GM 명령으로 직업 데이터를 읽는다', async () => {
      const 줄들 = await 데이터읽기(game, 'skill');
      const 탱커 = await verify.element('탱커 기본 체력이 직업 표와 같다', 'class:tank', 줄값(줄들, /탱커/, '체력'), 1200);
      const 궁수 = await verify.element('궁수 기본 체력이 직업 표와 같다', 'class:archer', 줄값(줄들, /궁수/, '체력'), 900);
      const 마법사 = await verify.element('마법사 기본 체력이 직업 표와 같다', 'class:mage', 줄값(줄들, /마법사/, '체력'), 800);
      const 도적 = await verify.element('도적 기본 체력이 직업 표와 같다', 'class:rogue', 줄값(줄들, /도적/, '체력'), 1000);
      await verify('직업 데이터를 읽으면 직업마다 기본 체력이 직업 표와 같다', 탱커 && 궁수 && 마법사 && 도적, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
