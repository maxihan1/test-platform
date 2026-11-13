import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-583',
  name: '레벨을 올려 큰 알림을 띄우면 「레벨 업!」 · 「보스 처치!」 큰 알림은 화면 가운데 큰 금색 글씨로 2.2초 동안 커졌다 사라진다',
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
  await test.step('레벨을 올려 큰 알림을 띄운다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('레벨을 올려 큰 알림을 띄우면 「레벨 업!」 · 「보스 처치!」 큰 알림은 화면 가운데 큰 금색 글씨로 2.2초 동안 커졌다 사라진다', await 뜨는지(game, 화면글자('레벨 업!')), true);
  });
});
