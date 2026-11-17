import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 접속자에서빠질때까지 } from './helpers/connect.helper.js';
import { 들어온이름, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-040',
  name: '캐릭터 이름이 비었으면 로그인했을 때 상단 바에 아이디가 이름으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 캐릭터 이름을 빈 글자로 바꿔 두었다', '일반 회원 캐릭터 이름을 「New Player」로 바꿔 두었다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 캐릭터 이름을 빈 글자로 바꿔 두고 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'raw', { level: 1, charName: '' });
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('이름이 빈 캐릭터로 로그인한다', async () => {
      await 로비로(game, 아이디, 비밀번호);
      await verify('캐릭터 이름이 비었으면 로그인했을 때 상단 바에 아이디가 이름으로 보인다', await 들어온이름(game), 아이디);
    });

    await test.step('게임을 다시 켜고 캐릭터 이름을 「New Player」로 바꿔 둔다', async () => {
      화면 = await 게임다시켜기(driver, game);
      await 접속자에서빠질때까지(admin, 아이디);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'raw', { level: 1, charName: 'New Player' });
    });
    await test.step('이름이 「New Player」인 캐릭터로 로그인한다', async () => {
      await 로비로(game, 아이디, 비밀번호);
      await verify('캐릭터 이름이 「New Player」여도 상단 바에 아이디가 이름으로 보인다', await 들어온이름(game), 아이디);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
