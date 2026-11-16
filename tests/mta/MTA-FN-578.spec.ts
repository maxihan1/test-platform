import { defineCase, test, verify } from '@platform/kit';
import { 길게누르기, 뜰때까지, 키누르기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 꾸러미 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 뜨는메뉴 } from './components/popup-menu.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-578',
  name: '런처 아이콘을 길게 누르면 「새 게시물」 · 「둘러보기」 바로가기가 켜져 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 런처의 앱 바로가기 메뉴를 열 길이 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    아이콘주소: z.string().describe('런처의 앱 아이콘 요소 주소'),
  }),
  expected: z.object({
    새글바로가기: z.string().describe('새 게시물 바로가기 이름').default('새 게시물'),
    둘러보기바로가기: z.string().describe('둘러보기 바로가기 이름').default('둘러보기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 메뉴 = new 뜨는메뉴(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('런처 아이콘을 길게 눌러 바로가기를 연다', async () => {
      await 키누르기(driver, '홈');
      await verify('런처 아이콘이 보인다', await 뜰때까지(driver, params.아이콘주소, 15_000), true, { blocker: true });
      await 길게누르기(driver, params.아이콘주소);
      const 새글 = await verify('「새 게시물」 바로가기가 보인다', await 뜰때까지(driver, 메뉴.항목(expected.새글바로가기), 10_000), true);
      const 둘러보기 = await verify('「둘러보기」 바로가기가 보인다', await 뜰때까지(driver, 메뉴.항목(expected.둘러보기바로가기), 10_000), true);
      const 켜짐 = await verify(
        '두 바로가기가 켜져 있다',
        (await driver.$(메뉴.항목(expected.새글바로가기)).getAttribute('enabled')) === 'true' && (await driver.$(메뉴.항목(expected.둘러보기바로가기)).getAttribute('enabled')) === 'true',
        true,
      );
      await verify('런처 아이콘을 길게 누르면 「새 게시물」 · 「둘러보기」 바로가기가 켜져 보인다', 새글 && 둘러보기 && 켜짐, true);
    });
  } finally {
    await driver.back();
    await driver.activateApp(꾸러미);
  }
});
