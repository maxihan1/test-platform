import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 서버화면바꾸기, type 풀기 } from './helpers/mock.helper.js';
import { 서버오류화면 } from './pages/server-error.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-990',
  name: '설정 화면 응답이 임시 서버 문제(503)면 「이 페이지는 임시적인 서버 문제로 인해 제공 될 수 없습니다.」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['설정 화면 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 화면 = new 서버오류화면(page);
  const 풀기목록: 풀기[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('임시 서버 문제가 나는 설정 화면을 연다', async () => {
      풀기목록.push(await 서버화면바꾸기(page, /\/settings\/profile$/, 503, '/503.html'));
      await 화면.설정열기();
      await verify('설정 화면 주소가 열려 있다', new URL(page.url()).pathname, '/settings/profile', { blocker: true });
      await verify('설정 화면 응답이 임시 서버 문제(503)면 「이 페이지는 임시적인 서버 문제로 인해 제공 될 수 없습니다.」가 보인다', await 화면.안내('이 페이지는 임시적인 서버 문제로 인해 제공 될 수 없습니다.').isVisible(), true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
