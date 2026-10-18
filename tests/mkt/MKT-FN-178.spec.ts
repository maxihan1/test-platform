import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 글번호들정리, 기본본문, 상세글번호 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-178',
  name: '제목 1자로 등록하면 글이 등록되지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 글 = new 게시글화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 회원?: 회원정보 } = {};
  const 만든글번호: number[] = [];

  try {
    await test.step('새 회원으로 로그인하고 글쓰기 화면을 연다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
      await 쓰기.열기();
    });

    await test.step('회원으로 로그인해 글쓰기 화면이 열렸는지 확인한다', async () => {
      await 쓰기.머리글.로그인꼴일때까지();
      await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
      await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.글쓰기제목.isVisible(), true, { blocker: true });
    });

    await test.step('제목 1자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 분류: '자유', 제목: '가', 본문: 기본본문 });
      const 응답 = await 쓰기.등록하고응답받기();
      if (응답.status() === 201) 만든글번호.push(((await 응답.json()) as { id: number }).id);
      await 알림.아무거나뜰때까지();
      await verify('제목 1자로 등록하면 글이 등록되지 않는다', [응답.status() === 201, new URL(page.url()).pathname], [false, '/board/write']);
    });

    await test.step('제목 2자로 「등록」을 누른다', async () => {
      await 쓰기.채우기({ 제목: '가나' });
      await 쓰기.등록하고응답받기();
      await 글.댓글불러올때까지();
      만든글번호.push(상세글번호(page.url()));
      await verify('제목 2자로 등록하면 그 글 상세로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname), true);
    });

    await test.step('제목 50자로 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await 쓰기.채우기({ 분류: '자유', 제목: '가'.repeat(50), 본문: 기본본문 });
      await 쓰기.등록하고응답받기();
      await 글.댓글불러올때까지();
      만든글번호.push(상세글번호(page.url()));
      await verify('제목 50자로 등록하면 그 글 상세로 간다', /^\/board\/\d+$/.test(new URL(page.url()).pathname), true);
    });
  } finally {
    await 글번호들정리(page.request, 만든글번호);
    if (준비.회원) await 회원정리(page.request, 준비.회원);
  }
});
