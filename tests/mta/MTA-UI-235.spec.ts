import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글수정하기, 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-235',
  name: '수정된 글 확장 푸터에 「마지막 수정: <시간>」이 보인다',
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
  const 상세 = new 글상세화면(driver);
  const 원글 = 테스트글('수정 표시');
  let 올림 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈에서 내 글을 올리고 본문을 고친다', async () => {
      await 글올리기(driver, 원글);
      올림 = true;
      await 내글수정하기(driver, 원글, ' 수정함');
    });

    await test.step('minjun_dev 의 수정된 글 상세를 연다', async () => {
      await 상세.본문눌러열기(원글);
      await verify('글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
      await verify('수정된 글 확장 푸터에 「마지막 수정: <시간>」이 보인다', await 상세.글보이나('마지막 수정: <시간>'), true);
    }, { capture: true });
  } finally {
    if (올림) {
      await 홈으로돌아가기(driver);
      await 내글지우기(driver, 원글);
    }
  }
});
