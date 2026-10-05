import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호 } from './components/board-helpers.component.js';
import { 모달 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판로그인화면 } from './pages/board-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-174',
  name: '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 확인창 = new 모달(page);
  const 로그인 = new 게시판로그인화면(page);
  let 글번호 = 0;

  await test.step('비회원으로 게시글 상세의 「좋아요」를 누른다', async () => {
    await 안내창끄기(page);
    글번호 = await 시드글번호(page.request);
    await 상세.열기(글번호);
    await 상세.좋아요버튼.click();
    await 확인창.열림기다리기();
    const 안내 = await 확인창.창.innerText();
    await verify(
      '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
      안내.includes('로그인이 필요합니다. 로그인 화면으로 이동할까요?'),
      true,
    );
  });

  await test.step('확인 모달의 「취소」를 누른다', async () => {
    await 확인창.버튼('취소').click();
    await 확인창.닫힘기다리기();
    await verify(
      '「취소」를 누르면 모달이 닫히고 게시글 상세에 그대로 머문다',
      { 모달: await 확인창.창.count(), 경로: await 상세.경로읽기(), 제목: await 상세.제목.isVisible() },
      { 모달: 0, 경로: `/board/${글번호}`, 제목: true },
    );
  });

  await test.step('「좋아요」를 다시 누르고 확인 모달의 「이동」을 누른다', async () => {
    await 상세.좋아요버튼.click();
    await 확인창.열림기다리기();
    await 확인창.버튼('이동').click();
    await 로그인.제목.waitFor();
    await verify('「이동」을 누르면 로그인 화면으로 간다', await 로그인.경로읽기(), '/login');
  });
});
