import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-179',
  name: '내 글 수정 화면에 기존 제목과 본문이 채워져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;
  let 제목 = '';
  let 본문 = '';

  try {
    await test.step('일회용 회원이 올린 내 글을 만들어 둔다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      제목 = 글.제목;
      본문 = 글.본문;
    });

    await test.step('내 글의 수정 화면을 연다', async () => {
      await 안내창막기(page);
      await 쓰기.수정열기(글번호);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('게시글 수정 화면 제목 「게시글 수정」이 보인다', await 쓰기.수정큰제목.isVisible(), true, { blocker: true });
      const 제목칸 = await verify('수정 화면 제목 칸에 기존 제목이 채워져 있다', await 쓰기.제목칸.inputValue(), 제목);
      const 본문칸 = await verify('수정 화면 본문 칸에 기존 본문이 채워져 있다', await 쓰기.본문칸.inputValue(), 본문);
      await verify('내 글 수정 화면에 기존 제목과 본문이 채워져 있다', 제목칸 && 본문칸, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
