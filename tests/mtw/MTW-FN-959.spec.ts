import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-959',
  name: '홈 응답이 늦는 동안 홈을 열면 「불러오는 중…」이 보인다',
  precondition: ['홈 응답은 늦춘 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 풀기목록: 풀기[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('홈 응답이 늦는 동안 홈을 연다', async () => {
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/home/, { 늦춤ms: 8_000 }));
      await 홈.열기();
      await verify('홈 화면이 열려 있다', await 홈.작성.영역.isVisible(), true, { blocker: true });
      await verify('홈 응답이 늦는 동안 홈을 열면 「불러오는 중…」이 보인다', await 홈.불러오는중.isVisible(), true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
