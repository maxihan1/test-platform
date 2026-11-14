import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 더보기항목들, 메뉴에있나, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-154',
  name: '내 공개 · 제한적 공개 글 더보기에 「인용 가능한 사용자 변경」이 보인다',
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
  const 본문 = 테스트글('공개 글 더보기');
  await test.step('내 새 글을 올린다', async () => {
    await 글올리기(driver, 본문);
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('내 새 공개 글의 더보기를 연다', async () => {
      const 항목들 = await 더보기항목들(driver, 본문);
      await verify('내 공개 · 제한적 공개 글 더보기에 「인용 가능한 사용자 변경」이 보인다', 메뉴에있나(항목들, '인용 가능한 사용자 변경'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 내글지우기(driver, 본문);
  }
});
