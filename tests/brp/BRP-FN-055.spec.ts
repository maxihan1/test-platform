import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터값넣기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-055',
  name: '이름이 빈 캐릭터로 로그인하면 상단 바 이름 자리에 로그인 아이디가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원 캐릭터 이름을 빈 이름으로 바꿔 두었다', '일반 회원 캐릭터 이름을 「New Player」로 바꿔 두었다'],
  techniques: ['동등 분할'],
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

  await test.step('일반 회원 캐릭터 이름을 빈 이름으로 바꿔 둔다', async () => {
    await 캐릭터값넣기(admin, 아이디, 비밀번호, { charName: '' });
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    const 접속 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    await verify('이름이 빈 캐릭터로 로그인하면 상단 바 이름 자리에 로그인 아이디가 보인다', 색글떼기(await 로비.hud.레벨이름()).endsWith(아이디), true);
  });

  await test.step('일반 회원 캐릭터 이름을 「New Player」로 바꿔 둔다', async () => {
    await 캐릭터값넣기(admin, 아이디, 비밀번호, { charName: 'New Player' });
  });

  await test.step('일반 회원으로 다시 로그인한다', async () => {
    const 접속 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 다시 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    await verify('이름이 「New Player」인 캐릭터로 로그인한 뒤 상단 바 이름 자리에 로그인 아이디가 보인다', 색글떼기(await 로비.hud.레벨이름()).endsWith(아이디), true);
  });
});
