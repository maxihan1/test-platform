import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-171',
  name: '내 글 수정 화면에 기존 분류 · 제목 · 본문이 채워져 보인다',
  precondition: ['회원으로 로그인해 내 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;
  let 제목 = '';
  let 본문 = '';
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      const 글 = await 글하나쓰기(나.api, '수정글', { category: '질문' });
      글번호 = 글.id;
      제목 = 글.제목;
      본문 = 글.본문;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('내 글 수정 화면을 연다', async () => {
      await 쓰기.수정열기(글번호);
      await 쓰기.준비될때까지();
      const 채워졌다 = (await 쓰기.분류.inputValue()) === '질문' && (await 쓰기.제목칸.inputValue()) === 제목 && (await 쓰기.본문칸.inputValue()) === 본문;
      await verify('내 글 수정 화면에 기존 분류 · 제목 · 본문이 채워져 보인다', 채워졌다, true);
    });
  } finally {
    await 정리.모두하기();
  }
});
