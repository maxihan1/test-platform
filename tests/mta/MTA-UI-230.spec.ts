import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 답글달기, 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-230',
  name: '글 본문을 누르면 제목 「<이름> 님의 게시물」 글 상세가 열리고 앞선 글이 위에, 답글이 아래에 이어진다',
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
  const 원글 = 테스트글('글타래 원글');
  const 답글 = 테스트글('글타래 답글');
  const 만든글: string[] = [];

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈에서 내 글을 올리고 그 글에 답글을 단다', async () => {
      await 글올리기(driver, 원글);
      만든글.push(원글);
      await 답글달기(driver, 원글, 답글);
      만든글.push(답글);
    });

    await test.step('홈 글 카드 본문을 누른다', async () => {
      await 상세.본문눌러열기(원글);
      await verify('글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
      const 제목 = await verify('글 상세 제목이 「<이름> 님의 게시물」이다', await 상세.제목보이나(), true);
      const 아래 = await verify('답글이 글 아래에 이어진다', (await 상세.글높이(답글)) > (await 상세.글높이(원글)), true);
      await 상세.답글눌러열기(답글);
      await verify('답글 글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
      const 위 = await verify('앞선 글이 답글 위에 이어진다', (await 상세.글높이(원글)) < (await 상세.글높이(답글)), true);
      await verify('글 본문을 누르면 제목 「<이름> 님의 게시물」 글 상세가 열리고 앞선 글이 위에, 답글이 아래에 이어진다', 제목 && 아래 && 위, true);
    }, { capture: true });
  } finally {
    await 홈으로돌아가기(driver);
    for (const 글 of 만든글.reverse()) await 내글지우기(driver, 글);
  }
});
