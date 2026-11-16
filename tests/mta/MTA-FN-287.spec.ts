import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 목록글을차례로열어보기 } from './helpers/post-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-287',
  name: '글 상세에서 「스포」 답글을 찾으면 필터 「스포일러」로 가려져 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    필터이름: z.string().describe('답글을 가린 필터 이름').default('스포일러'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 필터안내 = 글상세.목록글자포함('필터와 일치함');

  await test.step('일반 회원으로 로그인해 jiho_cafe 프로필을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 프로필열기(driver, 'jiho_cafe');
  });

  await test.step('jiho_cafe 글 상세에서 「스포」 답글을 찾는다', async () => {
    const 열림 = await 목록글을차례로열어보기(driver, () => 뜰때까지(driver, 필터안내, 3_000));
    await verify('필터 안내가 보이는 글 상세가 열린다', 열림, true, { blocker: true });
    const 안내 = await driver.$(필터안내).getText();
    await verify('글 상세에서 「스포」 답글을 찾으면 필터 「스포일러」로 가려져 보인다', 안내.includes(expected.필터이름), true);
  });
});
