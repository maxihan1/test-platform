import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지, 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-308',
  name: '로비 정보 상자에 「환영합니다, P<번호>!」와 「직업을 선택하세요」가 보인다',
  platforms: ['android'],
  precondition: ['영웅을 선택하지 않은 채 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내: z.string().describe('로비 정보 상자 글자 — 번호는 <번호>로 바꿔 견준다').default('환영합니다, P<번호>! · 직업을 선택하세요'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('영웅을 선택하지 않은 채 로비에 들어간다', async () => {
    await 로그인화면까지(game);
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    const 대기실 = await 로비.열기(game);
    await verify('로비에서 고른 영웅이 없다', await 대기실.고른직업이뜨는지(3_000), false, { blocker: true });
  });

  await test.step('로비 정보 상자를 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await verify(
      '로비 정보 상자에 「환영합니다, P<번호>!」와 「직업을 선택하세요」가 보인다',
      `${(await 대기실.환영글()).replace(/P\d+!$/, 'P<번호>!')} · ${await 대기실.직업안내글()}`,
      expected.안내,
    );
  });
});
