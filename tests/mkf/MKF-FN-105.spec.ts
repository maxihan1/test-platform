import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-105',
  name: '공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;

  await 방해막기(page);
  try {
    await test.step('새로 가입한 회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      글번호 = (await 글하나쓰기(나.api, '댓글글')).id;
    });

    await test.step('회원이 로그인해 글 상세를 열었는지 확인한다', async () => {
      await 상세.열기(글번호);
      await 상세.댓글까지그려질때까지();
      await verify('새로 가입한 회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
      await verify('회원이 쓴 글이 열려 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('댓글 입력칸에 공백만 적고 「등록」을 누른다', async () => {
      await 상세.댓글달기('   ');
      await 알림.글('댓글 내용을 입력하세요').first().waitFor();
      await verify('공백만 적고 등록하면 토스트 「댓글 내용을 입력하세요」가 보인다', await 알림.글('댓글 내용을 입력하세요').first().isVisible(), true);
    });

    await test.step('공백만 적고 「등록」을 누른 뒤 댓글 수를 확인한다', async () => {
      await verify('공백만 적고 등록하면 댓글 수가 늘지 않는다', await 상세.댓글제목.innerText(), '댓글 0');
    });
  } finally {
    await 정리.모두하기();
  }
});
