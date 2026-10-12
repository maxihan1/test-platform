import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-118',
  name: '댓글을 비운 채 「등록」을 누르면 댓글 수가 그대로다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  const 정리 = 정리함만들기();
  const 한글자 = '가';
  const 삼백자 = `${'나'.repeat(299)}다`;
  let 나!: 글쓴이;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글까지그려질때까지();
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('댓글을 비운 채 「등록」을 누른다', async () => {
      const 누르기전 = await 상세.댓글제목.innerText();
      await 상세.새댓글등록.click();
      await 알림.알림들.first().waitFor();
      await verify('댓글을 비운 채 「등록」을 누르면 댓글 수가 그대로다', await 상세.댓글제목.innerText(), 누르기전);
    });

    await test.step('댓글 1자를 적고 「등록」을 누른다', async () => {
      await 상세.댓글달기(한글자);
      await 상세.댓글(한글자).waitFor();
      await verify('댓글 1자를 「등록」하면 목록에 그 댓글이 보인다', (await 상세.댓글내용들()).includes(한글자), true);
    });

    await test.step('댓글 300자를 적고 「등록」을 누른다', async () => {
      await 상세.댓글달기(삼백자);
      await 상세.댓글(삼백자).waitFor();
      await verify('댓글 300자를 「등록」하면 목록에 그 댓글이 보인다', (await 상세.댓글내용들()).includes(삼백자), true);
    });

    await test.step('댓글 칸에 301자를 넣는다', async () => {
      await 상세.새댓글입력.fill(`${삼백자}라`);
      await verify('댓글 칸에 301자를 넣으면 300자까지만 들어간다', (await 상세.새댓글입력.inputValue()).length, 300);
    });
  } finally {
    await 정리.모두하기();
  }
});
