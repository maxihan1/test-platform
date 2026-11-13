import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-315',
  name: '상단 바에 금색 「Lv.<레벨>」, 「<골드> G」, 「<경험치>/<필요량>」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    모양: z.string().describe('상단 바 글자 — 수는 꺾쇠 이름으로 바꿔 견준다').default('금색 Lv.<레벨> · <골드> G · <경험치>/<필요량>'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('상단 바를 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await verify('상단 바에 금색 「Lv.<레벨>」, 「<골드> G」, 「<경험치>/<필요량>」이 보인다', await 대기실.상단바모양(), expected.모양);
  });
});
