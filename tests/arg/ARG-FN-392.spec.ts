import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-392',
  name: '영웅 카드를 누르면 정보 상자에 그 영웅의 직업 이름이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('로비에서 영웅 카드 하나를 누른다', async () => {
    const 대기실 = await 로비.열기(game);
    await 대기실.카드누르기(0);
    const 떴다 = await 대기실.고른직업이뜨는지();
    await verify('영웅 카드를 누르면 정보 상자에 그 영웅의 직업 이름이 보인다', 떴다 && (await 대기실.고른직업글()).trim() !== '', true);
  });
});
