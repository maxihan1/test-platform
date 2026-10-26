import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-122',
  name: '좋아요를 누른 글에서 다시 누르면 좋아요 수가 누르기 전 값으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;
  let 처음 = 0;

  try {
    await test.step('일회용 회원이 올린 내 글 상세를 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
      처음 = await 상세.좋아요수읽기();
    });

    await test.step('내 글에 「좋아요」를 눌러 둔다', async () => {
      await 상세.좋아요.click();
      await 상세.좋아요눌림될때까지(true);
      await verify('좋아요를 누른 글이다', (await 상세.좋아요수읽기()) - 처음, 1, { blocker: true });
    });

    await test.step('좋아요를 누른 글에서 「좋아요」를 다시 누른다', async () => {
      await 상세.좋아요.click();
      await 상세.좋아요눌림될때까지(false);
      await verify('좋아요를 누른 글에서 다시 누르면 좋아요 수가 누르기 전 값으로 돌아간다', await 상세.좋아요수읽기(), 처음);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
