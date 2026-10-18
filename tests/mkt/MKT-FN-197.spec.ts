import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 기본본문, 상세글번호 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고유글자, 글지우기 } from './helpers/data.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-197',
  name: '글을 등록한 뒤 글쓰기를 다시 열면 불러오기 확인 창이 뜨지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 글쓰기에서 임시 저장을 해 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 글 = new 게시글화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};
  const 제목 = 고유글자('등록 뒤 임시 저장 확인');

  try {
    await test.step('새 회원으로 로그인하고 글쓰기 화면에서 임시 저장을 해 둔다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
      await 쓰기.열기();
      await 쓰기.채우기({ 분류: '자유', 제목, 본문: 기본본문 });
      await 쓰기.임시저장.click();
      await 알림.아무거나뜰때까지();
    });

    await test.step('임시 저장본이 남았는지 확인한다', async () => {
      await 쓰기.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('임시 저장본이 이 브라우저 저장소에 있다', await 쓰기.임시저장본제목읽기(), 제목, { blocker: true });
    });

    await test.step('임시 저장본을 불러와 글을 등록하고 글쓰기 화면을 다시 연다', async () => {
      await 쓰기.확인창을처리하며열기('accept');
      await 쓰기.등록하고응답받기();
      await 글.댓글불러올때까지();
      준비.글번호 = 상세글번호(page.url());
      await verify('글을 등록한 뒤 글쓰기를 다시 열면 불러오기 확인 창이 뜨지 않는다', await 쓰기.확인창을처리하며열기('dismiss'), null);
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(page.request, 준비.글번호);
    if (준비.회원) await 회원정리(page.request, 준비.회원);
  }
});
