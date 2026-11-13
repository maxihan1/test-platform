import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 세로자리이름 } from './helpers/lobby-place.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-307',
  name: '로비 아래쪽에 영웅 카드 8장이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    세로: z.string().describe('영웅 카드 세로 자리').default('아래'),
    카드수: z.number().describe('영웅 카드 장수').default(8),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('로비 영웅 카드를 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await verify(
      '로비 아래쪽에 영웅 카드 8장이 보인다',
      `${await 세로자리이름(game, 로비.카드(0))} · ${String(await 대기실.카드수())}장`,
      `${expected.세로} · ${String(expected.카드수)}장`,
    );
  });
});
