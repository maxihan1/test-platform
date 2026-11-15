import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-156',
  name: '내용 경고 글 카드에서 「무시하고 표시」를 누르면 본문과 「다시 숨기기」가 보인다',
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
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('내용 경고 글 카드에서 「무시하고 표시」를 누른다', async () => {
    await 프로필열기(driver, 'seoyeon_books');
    await verify('내용 경고 글 카드에 「무시하고 표시」가 보인다', await 뜰때까지(driver, 카드.굴려서글자('무시하고 표시'), 25_000), true, { blocker: true });
    await driver.$(카드.굴려서글자('무시하고 표시')).click();
    const 다시숨기기 = await verify('「다시 숨기기」가 보인다', await 뜰때까지(driver, 카드.굴려서글자('다시 숨기기'), 15_000), true);
    const 표시사라짐 = await verify('「무시하고 표시」가 보이지 않는다', await 사라질때까지(driver, 홈.전체글자포함('무시하고 표시'), 10_000), true);
    await verify('내용 경고 글 카드에서 「무시하고 표시」를 누르면 본문과 「다시 숨기기」가 보인다', 다시숨기기 && 표시사라짐, true);
  });
});
