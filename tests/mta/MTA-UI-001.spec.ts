import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자들 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-001',
  name: '하단 탭에 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」 네 개가 보이고 「홈」이 기본 선택 탭이다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('앱에 로그인해 홈을 연다', async () => {
    const 이름표 = await verify('하단 탭 이름표가 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」이다', (await 글자들(driver, 홈.탭.이름표)).join(', '), '홈, 둘러보기, 알림, 프로필');
    const 선택 = await verify('「홈」 탭이 선택되어 있다', await driver.$(홈.탭.홈).getAttribute('selected'), 'true');
    await verify('하단 탭에 「홈」 · 「둘러보기」 · 「알림」 · 「프로필」 네 개가 보이고 「홈」이 기본 선택 탭이다', 이름표 && 선택, true);
  }, { capture: true });
});
