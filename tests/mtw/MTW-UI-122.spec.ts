import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-122',
  name: '설문 기간 선택 상자에 「5분」 · 「30분」 · 「1시간」 · 「6시간」 · 「1일」 · 「3일」 · 「7일」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('「설문 추가」를 누르고 기간 선택 상자를 연다', async () => {
    await 홈.작성.설문.click();
    await 글쓰기.기간선택.click();
    const 글자들 = await 글쓰기.기간옵션글자();
    const 오분 = await verify('「5분」이 보인다', 글자들.includes('5분'), true);
    const 삼십분 = await verify('「30분」이 보인다', 글자들.includes('30분'), true);
    const 한시간 = await verify('「1시간」이 보인다', 글자들.includes('1시간'), true);
    const 여섯시간 = await verify('「6시간」이 보인다', 글자들.includes('6시간'), true);
    const 하루 = await verify('「1일」이 보인다', 글자들.includes('1일'), true);
    const 사흘 = await verify('「3일」이 보인다', 글자들.includes('3일'), true);
    const 이레 = await verify('「7일」이 보인다', 글자들.includes('7일'), true);
    await verify(
      '설문 기간 선택 상자에 「5분」 · 「30분」 · 「1시간」 · 「6시간」 · 「1일」 · 「3일」 · 「7일」이 보인다',
      오분 && 삼십분 && 한시간 && 여섯시간 && 하루 && 사흘 && 이레,
      true,
    );
  });
});
