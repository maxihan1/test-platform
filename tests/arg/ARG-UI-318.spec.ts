import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 자리이름 } from './helpers/lobby-place.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-318',
  name: '로비 채팅 띠가 화면 오른쪽 아래에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    자리: z.string().describe('로비 채팅 띠 자리').default('오른쪽 아래'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('로비 채팅 띠 자리를 확인한다', async () => {
    await verify('로비 채팅 띠가 화면 오른쪽 아래에 보인다', await 자리이름(game, 공통HUD.채팅띠), expected.자리);
  });
});
