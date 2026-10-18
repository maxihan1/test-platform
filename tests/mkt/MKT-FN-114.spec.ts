import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 모달 } from './components/modal.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-114',
  name: '로그아웃 확인 창에서 「확인」을 누르면 홈 화면 머리글에 「로그인」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 확인창 = new 모달(page);

  await test.step('회원으로 로그인하고 게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 목록.열기();
  });

  await test.step('회원으로 로그인해 있는지 확인한다', async () => {
    await 목록.머리글.로그인꼴일때까지();
    await 목록.머리글.좁으면메뉴열기();
    await verify('머리글에 「로그아웃」이 보인다', await 목록.머리글.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그아웃 확인 창에서 「확인」을 누른다', async () => {
    await 목록.머리글.로그아웃버튼.click();
    await 확인창.뜰때까지(확인창.창);
    const 보낸수 = await 보낸요청끝날때까지(page, '/api/auth/logout', async () => {
      await 확인창.버튼(확인창.창, '확인').click();
      await 확인창.닫힐때까지(확인창.창);
    });
    if (보낸수 > 0) await 목록.머리글.로그아웃꼴일때까지();
    await 목록.머리글.좁으면메뉴열기();
    await verify('로그아웃 확인 창에서 「확인」을 누르면 홈 화면 머리글에 「로그인」이 보인다', await 목록.머리글.로그인링크.isVisible(), true);
  });
});
