import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-128',
  name: '글쓴이가 자기 글 상세를 열면 「수정」 · 「삭제」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('내가 쓴 글 상세를 연다', async () => {
      const 수정 = await verify('「수정」이 보인다', await 상세.수정.isVisible(), true);
      const 삭제 = await verify('「삭제」가 보인다', await 상세.삭제.isVisible(), true);
      await verify('글쓴이가 자기 글 상세를 열면 「수정」 · 「삭제」가 보인다', 수정 && 삭제, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
