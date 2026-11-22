import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 글색읽기, 레벨업글금색인가, 화면자리읽기 } from './helpers/dungeon.helper.js';
import { GM경험치, GM레벨 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-137',
  name: '레벨이 오르면 화면 가운데에 큰 금색 글씨 「레벨 업!」이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:2'],
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

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm level 1 뒤 /gm exp 100 을 준다', async () => {
    await GM레벨(game, 1);
    await GM경험치(game, 100);
    const 떴다 = await game.waitFor(던전화면.큰글, { timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('큰 글씨가 뜬다', 떴다, true, { blocker: true });
    const 글 = await game.text(던전화면.큰글);
    const 자리 = await 화면자리읽기(game, 던전화면.큰글);
    const 색 = await 글색읽기(game, 던전화면.큰글);
    const 내용 = await verify('큰 글씨가 「레벨 업!」이다', 글, '레벨 업!');
    const 가운데 = await verify('큰 글씨가 화면 가운데에 있다', Math.abs(자리.가로 - 0.5) < 0.15 && Math.abs(자리.세로 - 0.5) < 0.15, true);
    const 금색 = await verify('큰 글씨가 금색이다', 레벨업글금색인가(색), true);
    await verify('레벨이 오르면 화면 가운데에 큰 금색 글씨 「레벨 업!」이 뜬다', 내용 && 가운데 && 금색, true);
  });
});
