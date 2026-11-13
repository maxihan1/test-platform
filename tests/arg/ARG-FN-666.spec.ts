import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-666',
  name: '결과 화면에서 「메인 메뉴로」를 누르면 접속을 끊고 메인 메뉴(로그인 창)로 돌아간다',
  platforms: ['android'],
  precondition: ['결과 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 전투 상태를 만드는 길 없음(어드민 API와 GM 명령이 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「메인 메뉴로」를 누른다', async () => {
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('결과 화면에서 「메인 메뉴로」를 누르면 접속을 끊고 메인 메뉴(로그인 창)로 돌아간다', await 뜨는지(game, 화면글자('메인 메뉴로')), true);
  });
});
