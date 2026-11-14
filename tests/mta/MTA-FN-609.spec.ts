import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 글자요소누르기, 내글남김없이지우기, 사진첨부하기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-609',
  name: '대체 텍스트 10000자로 게시하면 오류 없이 게시된다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 폰 사진첩의 사진을 앱 글쓰기에 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진파일: z.string().describe('첨부할 사진 파일 이름'),
    오류문구: z.string().describe('게시가 실패할 때 보이는 오류 문구'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('대체 텍스트 한도');
  try {
    await test.step('대체 텍스트에 10000자를 적어 게시한다', async () => {
      await 글쓰기열기(driver);
      await 사진첨부하기(driver, params.사진파일);
      await 글자요소누르기(driver, '대체 텍스트 추가');
      await 글쓰기.대체텍스트적기('가'.repeat(10_000));
      await 뒤로(driver);
      await 글쓰기.본문적기(본문);
      await 글쓰기.게시누르기();
      const 게시됨 = await verify('게시한 뒤 홈이 보인다', await 홈.떴나(60_000), true);
      const 오류없음 = await verify('게시한 뒤 오류 문구가 보이지 않는다', !(await 문구가보이나(driver, params.오류문구, 3_000)), true);
      await verify('대체 텍스트 10000자로 게시하면 오류 없이 게시된다', 게시됨 && 오류없음, true);
    });
    await test.step('대체 텍스트에 10001자를 적어 게시한다', async () => {
      await 글쓰기열기(driver);
      await 사진첨부하기(driver, params.사진파일);
      await 글자요소누르기(driver, '대체 텍스트 추가');
      await 글쓰기.대체텍스트적기('가'.repeat(10_001));
      await 뒤로(driver);
      await 글쓰기.본문적기(본문);
      await 글쓰기.게시누르기();
      await verify('대체 텍스트 10001자에서는 오류 문구가 보인다', await 문구가보이나(driver, params.오류문구), true);
    }, { capture: true });
  } finally {
    await 내글남김없이지우기(driver, 본문);
  }
});
