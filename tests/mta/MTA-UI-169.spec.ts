import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기 } from './helpers/post.helper.js';
import { 문구가보이나, 내글수정열기, 내글모두지우기 } from './helpers/compose-flow.helper.js';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-169',
  name: '글 수정 화면 상단에 「게시물 편집」과 「저장」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('글 수정 화면 제목').default('게시물 편집'),
    저장: z.string().describe('글 수정 화면 저장 버튼 글자').default('저장'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 본문 = 표시글('수정 화면 확인');
  const 홈 = new 홈화면(driver);

  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });

    await test.step('내 새 글을 올린다', async () => {
      await 내글쓰기(driver, 본문);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });

    await test.step('내 새 글 더보기에서 「수정」을 누른다', async () => {
      await 내글수정열기(driver, 본문);
      const 제목 = await verify('수정 화면 제목이 보인다', await 문구가보이나(driver, expected.제목), true);
      const 저장 = await verify('수정 화면 「저장」이 보인다', await 문구가보이나(driver, expected.저장), true);
      await verify('글 수정 화면 상단에 「게시물 편집」과 「저장」이 보인다', 제목 && 저장, true);
    });
  } finally {
    await 내글모두지우기(driver, 본문);
  }
});
