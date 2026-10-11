import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 남의시드글, 로그인화면표시기다리기 } from './helpers/board.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-051',
  name: '비회원이 「좋아요」 를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」 가 뜬다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);

  await test.step('게시글 상세를 연다', async () => {
    await 방해막기(page);
    await 상세.열기(남의시드글);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('게시글 상세에 「좋아요」 버튼이 보인다', await 상세.좋아요버튼.isVisible(), true, { blocker: true });
  });

  await test.step('비회원으로 게시글 상세에서 「좋아요」 를 누른다', async () => {
    await 상세.좋아요버튼.click();
    await 창.창.waitFor();
    await verify('비회원이 「좋아요」 를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」 가 뜬다', await 창.본문.innerText(), '로그인이 필요합니다. 로그인 화면으로 이동할까요?');
  });

  await test.step('확인 모달에서 「취소」 를 누른다', async () => {
    await 창.버튼('취소').click();
    await 창.창.waitFor({ state: 'detached' });
    await verify(
      '확인 모달에서 「취소」 를 누르면 상세 화면에 그대로 있다',
      { 주소: new URL(page.url()).pathname, 제목보임: await 상세.제목.isVisible() },
      { 주소: `/board/${남의시드글}`, 제목보임: true },
    );
  });

  await test.step('「좋아요」 를 다시 눌러 확인 모달에서 「이동」 을 누른다', async () => {
    await 상세.좋아요버튼.click();
    await 창.창.waitFor();
    await 창.버튼('이동').click();
    await 로그인화면표시기다리기(page);
    await verify('확인 모달에서 「이동」 을 누르면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
  });

  await test.step('비회원으로 게시글 상세를 연다', async () => {
    await 상세.열기(남의시드글);
    await 상세.댓글불러오기기다리기();
    await verify(
      '비회원으로 연 상세에는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
      { 링크: await 상세.댓글로그인링크.isVisible(), 입력칸: await 상세.댓글입력칸.count() },
      { 링크: true, 입력칸: 0 },
    );
  });
});
