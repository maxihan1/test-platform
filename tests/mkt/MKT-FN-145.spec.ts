import { defineCase, test, verify } from '@platform/kit';
import { 토스트 } from './components/toast.component.js';
import { type 글쓴이와글, 글쓴이와글만들기, 글쓴이와글정리, 클립보드권한주기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-145',
  name: '「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 나온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['클립보드 권한을 주었다', '대상 서버 주소가 http 라 브라우저에 클립보드가 없어 가짜 클립보드(모킹)를 쓴다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 글 = new 게시글화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 글?: 글쓴이와글 } = {};

  try {
    await test.step('회원이 쓴 글을 만들고 클립보드 권한을 준다', async () => {
      준비.글 = await 글쓴이와글만들기(request, '링크 복사 확인');
      await 클립보드권한주기(page);
      await 방해창막기(page);
    });

    await test.step('쓴 글의 상세를 연다', async () => {
      await 글.열기(준비.글?.글번호 ?? 0);
      await verify('게시글 상세 제목이 방금 쓴 글 제목이다', await 글.제목.innerText(), 준비.글?.제목, { blocker: true });
    });

    await test.step('게시글 상세에서 「링크 복사」를 누른다', async () => {
      await 글.링크복사.click();
      await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 나온다', await (await 알림.아무거나뜰때까지()).innerText(), '링크를 복사했습니다');
    });

    await test.step('클립보드 내용을 확인한다', async () => {
      await verify('「링크 복사」 뒤 클립보드에 그 글 주소가 들어 있다', await 글.클립보드읽기(), `${new URL(page.url()).origin}/board/${준비.글?.글번호}`);
    });
  } finally {
    if (준비.글) await 글쓴이와글정리(request, 준비.글);
  }
});
