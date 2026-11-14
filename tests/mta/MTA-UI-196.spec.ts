import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로 } from './helpers/app.helper.js';
import { 앱밖으로나갔나, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-196',
  name: 'Android 13 이상(또는 확장 지원 11·12)은 사진 고르기에 시스템 사진 선택기를, 그 밖은 파일 선택기를 연다',
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
    await test.step('글쓰기에서 「미디어 추가」를 누른다', async () => {
      await 글쓰기.미디어누르기();
      await verify('Android 13 이상(또는 확장 지원 11·12)은 사진 고르기에 시스템 사진 선택기를, 그 밖은 파일 선택기를 연다', await 앱밖으로나갔나(driver), true);
      await 뒤로(driver);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
