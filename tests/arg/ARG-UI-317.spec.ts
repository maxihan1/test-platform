import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-317',
  name: '채팅 띠에 최근 채팅 줄이 2줄까지 보인다',
  platforms: ['android'],
  precondition: ['로그인 뒤 채팅을 보내지 않았다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    최대줄수: z.number().describe('채팅 띠에 보이는 최대 줄 수').default(2),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('채팅 띠를 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await verify('채팅 띠에 최근 채팅 줄이 2줄까지 보인다', (await 대기실.채팅띠줄수()) <= expected.최대줄수, true);
  });
});
