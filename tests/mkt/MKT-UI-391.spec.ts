import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-391',
  name: '글쓰기 화면에서 「취소」를 누르면 게시판 목록 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);

  await test.step('회원으로 로그인하고 글쓰기 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 쓰기.열기();
  });

  await test.step('회원으로 로그인해 글쓰기 화면이 열렸는지 확인한다', async () => {
    await 쓰기.머리글.로그인꼴일때까지();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 쓰기.머리글.로그아웃버튼.count(), 1, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.글쓰기제목.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기 화면에서 「취소」를 누른다', async () => {
    await 쓰기.취소.click();
    await 목록.내용그려질때까지();
    await verify('글쓰기 화면에서 「취소」를 누르면 게시판 목록 화면이 보인다', await 목록.제목.isVisible(), true);
    await 쓰기.열기();
  });

  await test.step('글쓰기 화면에서 「등록」을 누른다', async () => {
    await verify('글쓰기 화면에서 「등록」을 누르면 버튼이 보이고 누를 수 있다', (await 쓰기.등록.isVisible()) && (await 쓰기.등록.isEnabled()), true);
  });

  await test.step('글쓰기 화면에서 「임시 저장」을 누른다', async () => {
    await 쓰기.임시저장.click();
    await verify('글쓰기 화면에서 「임시 저장」을 누르면 「임시 저장되었습니다」 토스트가 뜬다', await (await 알림.아무거나뜰때까지()).innerText(), '임시 저장되었습니다');
  });
});
