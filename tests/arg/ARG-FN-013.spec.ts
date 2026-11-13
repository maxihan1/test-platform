import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-013',
  name: '맞는 아이디와 비밀번호로 「게임 시작」을 누르면 로비 화면 제목 「영웅을 선택하세요!」가 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('로비 화면 제목').default('영웅을 선택하세요!'),
  }),
  smoke: true,
});

test(spec, async ({ game, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('맞는 아이디와 비밀번호를 넣고 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로비 화면 제목을 확인한다', async () => {
    const 대기실 = await 로비.열기(game);
    await verify('맞는 아이디와 비밀번호로 「게임 시작」을 누르면 로비 화면 제목 「영웅을 선택하세요!」가 보인다', await 대기실.제목글(), expected.제목);
  });
});
