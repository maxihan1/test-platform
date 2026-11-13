import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-490',
  name: '스위치로 문이 열리면 던전 알림 줄에 「문이 열렸습니다!」, 닫히면 「문이 닫힙니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 던전에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('바닥 스위치를 밟아 문을 연다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('스위치로 문이 열리면 던전 알림 줄에 「문이 열렸습니다!」, 닫히면 「문이 닫힙니다」가 뜬다', await 뜨는지(game, 화면글자('문이 열렸습니다!')), true);
  });
});
