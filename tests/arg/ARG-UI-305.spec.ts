import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 자리이름 } from './helpers/lobby-place.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-305',
  name: '로비 왼쪽 위에 「영웅을 선택하세요!」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    자리: z.string().describe('로비 제목 자리').default('왼쪽 위'),
    제목: z.string().describe('로비 제목 글자').default('영웅을 선택하세요!'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('로비 화면을 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await verify(
      '로비 왼쪽 위에 「영웅을 선택하세요!」가 보인다',
      `${await 자리이름(game, 로비.제목)} · ${await 대기실.제목글()}`,
      `${expected.자리} · ${expected.제목}`,
    );
  });
});
