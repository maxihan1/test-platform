import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-069',
  name: '로비에서 탱커 카드를 누르면 정보 상자에 「탱커」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['class:tank', 'zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    직업: z.string().describe('정보 상자 직업 이름').default('탱커'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('로비에서 탱커 카드를 누른다', async () => {
    const 대기실 = await 로비.열기(game);
    await 대기실.직업고르기('탱커');
    await verify('로비에서 탱커 카드를 누르면 정보 상자에 「탱커」가 보인다', await 대기실.고른직업글(), expected.직업);
  });
});
