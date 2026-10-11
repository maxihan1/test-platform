import { defineCase, test, verify } from '@platform/kit';

import { 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-100',
  name: '게시글 상세를 다시 열면 조회수가 1 오른다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  let 처음조회수 = 0;
  await 방해막기(page);

  try {
    await test.step('회원이 쓴 글 상세를 한 번 연다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '조회글')).id;
      await 상세.열기(글번호);
    });

    await test.step('게시글 상세가 열렸는지 확인한다', async () => {
      await 상세.그려질때까지();
      처음조회수 = await 상세.조회수();
      await verify('게시글 상세가 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('같은 게시글 상세를 다시 연다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await verify('게시글 상세를 다시 열면 조회수가 1 오른다', await 상세.조회수(), 처음조회수 + 1);
    });
  } finally {
    await 정리.모두하기();
  }
});
