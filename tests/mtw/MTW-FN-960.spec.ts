import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-960',
  name: '홈 응답이 500 이면 홈 화면이 깨지지 않고 오류 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['홈 응답은 가짜 응답(모킹)이다'],
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
    await test.step('홈 응답을 500 으로 바꾸고 홈을 연다', async () => {
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/home/, { 상태: 500, 본문: { error: '서버 오류' } }));
      await 홈.열기();
      await verify('홈 화면이 열려 있다', await 홈.작성.영역.isVisible(), true, { blocker: true });
      const 깨지지않음 = await verify('홈 화면이 깨지지 않는다', await 홈.메뉴.링크('알림').isVisible(), true);
      const 안내 = await 홈.알림.모두.filter({ hasText: /\S/ }).first().waitFor({ timeout: 5_000 }).then(() => true, () => false);
      const 오류안내 = await verify('오류 안내가 보인다', 안내, true);
      await verify('홈 응답이 500 이면 홈 화면이 깨지지 않고 오류 안내가 보인다', 깨지지않음 && 오류안내, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
