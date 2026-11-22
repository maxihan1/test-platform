import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-133',
  name: '/gm level 5 로 바꾸고 상단 바 경험치 글을 읽으면 레벨 5 의 다음 레벨까지 경험치는 100 × 5^1.5 를 버린 1118 이라 상단 바에 「0/1118」이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:5', 'level:30'],
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

  await test.step('/gm level 5 로 바꾸고 상단 바 경험치 글을 읽는다', async () => {
    await GM레벨(game, 5);
    const 올랐다 = await game.waitFor(공통HUD.레벨이름주소, { text: 'Lv.5', timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('상단 바 레벨이 「Lv.5」다', 올랐다, true, { blocker: true });
    await verify('/gm level 5 로 바꾸고 상단 바 경험치 글을 읽으면 레벨 5 의 다음 레벨까지 경험치는 100 × 5^1.5 를 버린 1118 이라 상단 바에 「0/1118」이 보인다', await new 공통HUD(game).경험치글(), '0/1118');
  });

  await test.step('/gm level 30 으로 바꾸고 /gm stat 다음 레벨을 읽는다', async () => {
    await GM레벨(game, 30);
    const 값 = await GM스탯(game);
    await verify('레벨 30 은 다음 레벨까지 경험치가 0 이다', 스탯숫자(값, '다음레벨'), 0);
  });
});
