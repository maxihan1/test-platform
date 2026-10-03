import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 모달 } from './components/modal.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-070',
  name: '비회원이 「좋아요」를 누르면 로그인 확인 모달이 뜨고 「취소」와 「이동」이 각각 동작한다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '글 상세 화면이다', '로그인 확인 모달이 떠 있다'],
  params: z.object({
    postId: z.number().describe('글 번호').default(48),
  }),
  expected: z.object({
    message: z.string().describe('확인 모달 문구').default('로그인이 필요합니다. 로그인 화면으로 이동할까요?'),
    loginPath: z.string().describe('로그인 화면 경로').default('/login'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 게시글상세(page);
  const 대화상자 = new 모달(page);
  const 로그인 = new 로그인폼(page);

  await test.step('글 상세 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 상세.열기(params.postId);
    await 상세.좋아요.waitFor();
  });

  await test.step('「좋아요」를 누른다', async () => {
    await 상세.좋아요.click();
    await 상세.로그인확인문구.waitFor();
    await verify(
      '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
      await 상세.로그인확인문구.innerText(),
      expected.message,
    );
  });

  await test.step('모달에서 「취소」를 누른다', async () => {
    await 대화상자.바닥버튼('확인', '취소').click();
    await 대화상자.전체.waitFor({ state: 'detached' });
    await verify('확인 모달에서 「취소」를 누르면 글 상세에 그대로 머문다', new URL(page.url()).pathname, `/board/${params.postId}`);
  });

  await test.step('글 상세에서 「좋아요」를 다시 눌러 모달을 띄운다', async () => {
    await 상세.좋아요.click();
    await 상세.로그인확인문구.waitFor();
  });

  await test.step('모달에서 「이동」을 누른다', async () => {
    await 대화상자.바닥버튼('확인', '이동').click();
    await 로그인.로그인버튼.waitFor();
    await verify('확인 모달에서 「이동」을 누르면 로그인 화면으로 간다', new URL(page.url()).pathname, expected.loginPath);
  });
});
