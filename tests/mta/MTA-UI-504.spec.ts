import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜰때까지, 문구가보이나 } from './helpers/app.helper.js';
import { 글자요소가보이나, 글자요소누르기, 사진첨부하기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-504',
  name: '대체 텍스트 입력 화면에 제목 「대체 텍스트 추가」 · 미리보기 · 입력 힌트 「대체 텍스트」 · 도움말 「대체 텍스트란 무엇인가요?」가 보인다',
  platforms: ['android'],
  held: '보류 — 폰 사진첩의 사진을 앱 글쓰기에 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진파일: z.string().describe('첨부할 사진 파일 이름'),
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
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기에 사진을 넣고 「대체 텍스트 추가」를 누른다', async () => {
      await 사진첨부하기(driver, params.사진파일);
      await 글자요소누르기(driver, '대체 텍스트 추가');
      const 힌트 = await verify('입력 힌트가 「대체 텍스트」다', await 뜰때까지(driver, 글쓰기.대체텍스트칸), true, { blocker: true });
      const 제목 = await verify('입력 화면 제목이 「대체 텍스트 추가」다', await 글자요소가보이나(driver, '대체 텍스트 추가'), true);
      const 도움말 = await verify('도움말 「대체 텍스트란 무엇인가요?」가 보인다', await 문구가보이나(driver, '대체 텍스트란 무엇인가요?'), true);
      await verify('대체 텍스트 입력 화면에 제목 「대체 텍스트 추가」 · 미리보기 · 입력 힌트 「대체 텍스트」 · 도움말 「대체 텍스트란 무엇인가요?」가 보인다', 힌트 && 제목 && 도움말, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
