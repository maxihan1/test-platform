import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-193',
  name: '「스타일」을 누르면 「선택해 주세요」 · 「다중 선택」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('투표의 「스타일」을 누른다', async () => {
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    await driver.$(글쓰기.스타일).click();
    const 단일 = await verify('「선택해 주세요」가 보인다', await 글쓰기.메뉴.뜰때까지('선택해 주세요'), true);
    const 다중 = await verify('「다중 선택」이 보인다', await 글쓰기.메뉴.뜰때까지('다중 선택'), true);
    await verify('「스타일」을 누르면 「선택해 주세요」 · 「다중 선택」이 보인다', 단일 && 다중, true);
  });
});
