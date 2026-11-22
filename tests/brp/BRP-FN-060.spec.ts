import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터값넣기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-060',
  name: '레벨이 31 인 캐릭터로 로그인하면 상단 바 레벨이 「Lv.30」으로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원 캐릭터 레벨을 31 로 넣어 두었다', '일반 회원 캐릭터 레벨을 0 으로 넣어 두었다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원 캐릭터 레벨을 31 로 넣어 둔다', async () => {
    await 캐릭터값넣기(admin, 아이디, 비밀번호, { level: 31 });
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    const 접속 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    await verify('레벨이 31 인 캐릭터로 로그인하면 상단 바 레벨이 「Lv.30」으로 보인다', /Lv\.30(?!\d)/.test(색글떼기(await 로비.hud.레벨이름())), true);
  });

  await test.step('일반 회원 캐릭터 레벨을 0 으로 넣어 둔다', async () => {
    await 캐릭터값넣기(admin, 아이디, 비밀번호, { level: 0 });
  });

  await test.step('일반 회원으로 다시 로그인한다', async () => {
    const 접속 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 다시 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    await verify('레벨이 0 인 캐릭터로 로그인한 뒤 상단 바 레벨이 「Lv.1」로 보인다', /Lv\.1(?!\d)/.test(색글떼기(await 로비.hud.레벨이름())), true);
  });
});
