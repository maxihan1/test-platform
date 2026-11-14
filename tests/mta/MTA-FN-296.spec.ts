import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메뉴 } from './components/menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 인용정책시트 } from './pages/quote-policy.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-296',
  name: '내 새 글 더보기에서 「인용 가능한 사용자 변경」을 누르고 바꾸면 이미 게시한 글의 인용 정책은 더보기 「인용 가능한 사용자 변경」으로 바꾼다',
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
  const 카드 = new 글카드(driver);
  const 팝업 = new 메뉴(driver);
  const 정책 = new 인용정책시트(driver);
  const 원글 = 테스트글('인용 정책');
  let 올림 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈에서 내 새 글을 올린다', async () => {
      await 글올리기(driver, 원글);
      올림 = true;
    });

    await test.step('내 새 글 더보기에서 「인용 가능한 사용자 변경」을 누르고 바꾼다', async () => {
      await 카드.누르기(원글, 'more');
      const 항목 = await verify('글 더보기 메뉴에 「인용 가능한 사용자 변경」이 있다', (await 팝업.항목글자()).includes('인용 가능한 사용자 변경'), true);
      await 팝업.고르기('인용 가능한 사용자 변경');
      await verify('인용 정책 시트가 보인다', await 정책.떴나(), true);
      await 정책.정책고르기('팔로워만');
      await 정책.저장누르기();
      await 카드.누르기(원글, 'more');
      await 팝업.고르기('인용 가능한 사용자 변경');
      await verify('고친 뒤 인용 정책 시트가 다시 보인다', await 정책.떴나(), true);
      const 바뀜 = await verify('인용 정책이 「팔로워만」으로 바뀌어 있다', await 정책.정책글(), '팔로워만');
      await verify('내 새 글 더보기에서 「인용 가능한 사용자 변경」을 누르고 바꾸면 이미 게시한 글의 인용 정책은 더보기 「인용 가능한 사용자 변경」으로 바꾼다', 항목 && 바뀜, true);
      await 정책.취소누르기();
    }, { capture: true });
  } finally {
    if (올림) {
      await 홈으로돌아가기(driver);
      await 내글지우기(driver, 원글);
    }
  }
});
