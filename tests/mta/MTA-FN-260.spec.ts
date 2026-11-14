import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 글이될때까지, 범위글올리기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-260',
  name: '내 팔로워 공개 새 글에 「답장」을 누르면 답장의 공개 범위는 원문 범위와 기본값 중 더 좁은 쪽으로 시작한다',
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
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('팔로워 답장');
  await test.step('내 새 글을 팔로워 범위로 올린다', async () => {
    await 범위글올리기(driver, 본문, '팔로워');
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('내 팔로워 공개 새 글에 「답장」을 누른다', async () => {
      await 카드.누르기(본문, 'reply_btn');
      await verify('답장 글쓰기가 열린다', await 글쓰기.떴나(), true, { blocker: true });
      await verify('내 팔로워 공개 새 글에 「답장」을 누르면 답장의 공개 범위는 원문 범위와 기본값 중 더 좁은 쪽으로 시작한다', await 글이될때까지(driver, 글쓰기.공개범위글, '팔로워'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 내글지우기(driver, 본문);
  }
});
