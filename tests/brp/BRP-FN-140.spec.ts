import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨 } from './helpers/gm.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-140',
  name: '최고 레벨이면 경험치 막대가 가득 차 있다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:30'],
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

  await test.step('/gm level 30 으로 바꾸고 상단 바 경험치 막대를 읽는다', async () => {
    await GM레벨(game, 30);
    const 올랐다 = await game.waitFor(공통HUD.레벨이름주소, { text: 'Lv.30', timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('상단 바 레벨이 「Lv.30」이다', 올랐다, true, { blocker: true });
    await verify('최고 레벨이면 경험치 막대가 가득 차 있다', Number(await game.get(공통HUD.경험치막대주소, 'Image.fillAmount')), 1);
  });

  await test.step('/gm level 30 으로 바꾸고 상단 바 경험치 글을 읽는다', async () => {
    await GM레벨(game, 30);
    await verify('최고 레벨일 때 경험치 막대 글이 「최고 레벨」로 보인다', await new 공통HUD(game).경험치글(), '최고 레벨');
  });
});
