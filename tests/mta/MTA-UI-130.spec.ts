import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 글자요소가보이나, 글자요소누르기, 글자요소찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-130',
  name: '내용 경고 글 카드에 경고 문구와 「무시하고 표시」가 보이고 누르면 본문과 「다시 숨기기」가 보인다',
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
  await test.step('seoyeon_books 프로필의 내용 경고 글에서 「무시하고 표시」를 누른다', async () => {
    await 프로필열기(driver, 'seoyeon_books');
    const 가림 = await verify('내용 경고 글 카드에 「무시하고 표시」가 보인다', await 글자요소찾기(driver, '무시하고 표시'), true);
    await 글자요소누르기(driver, '무시하고 표시');
    const 펼침 = await verify('「무시하고 표시」를 누른 뒤 「다시 숨기기」가 보인다', await 글자요소가보이나(driver, '다시 숨기기'), true);
    await verify('내용 경고 글 카드에 경고 문구와 「무시하고 표시」가 보이고 누르면 본문과 「다시 숨기기」가 보인다', 가림 && 펼침, true);
  }, { capture: true });
});
