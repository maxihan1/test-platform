import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-329',
  name: '우편함 창에 제목 「우편함」, 「모두 받기」, 「닫기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('우편함 창 제목').default('우편함'),
    모두받기: z.string().describe('모두 받기 버튼 글자').default('모두 받기'),
    닫기: z.string().describe('닫기 버튼 글자').default('닫기'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('우편함 창을 연다', async () => {
    const 창 = await 우편함창.열기(game);
    const 제목 = await verify('우편함 창 제목이 「우편함」으로 보인다', await 창.제목글(), expected.제목);
    const 모두받기 = await verify('우편함 창에 「모두 받기」 버튼이 보인다', await 창.모두받기글(), expected.모두받기);
    const 닫기 = await verify('우편함 창에 「닫기」 버튼이 보인다', await 창.닫기글(), expected.닫기);
    await verify('우편함 창에 제목 「우편함」, 「모두 받기」, 「닫기」가 보인다', 제목 && 모두받기 && 닫기, true);
  });
});
