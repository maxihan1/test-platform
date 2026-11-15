import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기, 프로필에서글열기 } from './helpers/nav.helper.js';
import { 수정내역화면 } from './pages/edit-history.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-292',
  name: '확장 푸터의 「마지막 수정」을 누르면 「수정 내역」 화면이 열린다',
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
  const 글상세 = new 글상세화면(driver);
  const 수정내역 = new 수정내역화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('수정된 글 상세에서 「마지막 수정」을 누른다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    await 프로필에서글열기(driver, '에 수정함');
    await verify('수정된 글 상세에 「마지막 수정」이 보인다', await 뜰때까지(driver, 글상세.목록글자포함('마지막 수정'), 10_000), true, { blocker: true });
    await driver.$(글상세.목록글자포함('마지막 수정')).click();
    await verify('확장 푸터의 「마지막 수정」을 누르면 「수정 내역」 화면이 열린다', await 수정내역.글자가뜰때까지('수정 내역'), true);
  });
});
