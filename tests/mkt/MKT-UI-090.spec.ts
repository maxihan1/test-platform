import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 모달 } from './components/modal.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-090',
  name: '「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다',
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

  await test.step('머리글의 「로그아웃」을 누른다', async () => {
    await 목록.머리글.로그아웃버튼.click();
    await 확인창.뜰때까지(확인창.창);
    await verify('「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다', await 확인창.글이든('로그아웃 하시겠습니까?').isVisible(), true);
  });
});
