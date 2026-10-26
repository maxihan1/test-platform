import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 글번호읽기, 창기록하기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-176',
  name: '임시 저장한 글을 등록하면 글쓰기에 다시 들어와도 불러오기 확인 창이 뜨지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 받은창 = 창기록하기(page, () => false);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 일회용회원으로로그인(page);
      await 안내창막기(page);
      await 쓰기.열기();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
    });

    await test.step('제목과 본문을 적고 「임시 저장」을 누른 뒤 글을 등록한다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '임시 저장 뒤 등록하는 제목', 본문: '임시 저장 뒤 등록하는 본문입니다 열 글자가 넘습니다' });
      await 쓰기.임시저장.click();
      await Promise.all([page.waitForURL(/\/board\/\d+$/), 쓰기.등록.click()]);
      await 상세.그려질때까지();
      글번호 = 글번호읽기(page);
      await verify('등록한 글의 상세가 보인다', await 상세.제목.innerText(), '임시 저장 뒤 등록하는 제목', { blocker: true });
    });

    await test.step('임시 저장한 글을 등록한 뒤 글쓰기에 다시 들어온다', async () => {
      받은창.length = 0;
      await 쓰기.열기();
      await verify('임시 저장한 글을 등록하면 글쓰기에 다시 들어와도 불러오기 확인 창이 뜨지 않는다', 받은창.filter((창) => 창.종류 === 'confirm').length, 0);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
