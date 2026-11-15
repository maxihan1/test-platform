import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 부스트시트 } from './pages/boost-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-173',
  name: 'seoyeon_books 의 인용 불가 글에서 「부스트」를 누르면 시트에 「오직 팔로워만 이 게시물을 인용할 수 있습니다.」 또는 「You are not allowed to quote this post」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
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
  const 시트 = new 부스트시트(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('인용 불가 글 상세에서 「부스트」를 누른다', async () => {
    await 글상세열기(driver, 'seoyeon_books', '인용');
    await driver.$(글상세.부스트).click();
    await verify('seoyeon_books 의 인용 불가 글에서 「부스트」를 누르면 시트에 「오직 팔로워만 이 게시물을 인용할 수 있습니다.」 또는 「You are not allowed to quote this post」가 보인다', await 될때까지(driver, async () => (await 보이나(driver, 시트.전체글자포함('오직 팔로워만 이 게시물을 인용할 수 있습니다.'))) || (await 보이나(driver, 시트.전체글자포함('You are not allowed to quote this post'))), 10_000), true);
    await 시트.닫기();
  });
});
