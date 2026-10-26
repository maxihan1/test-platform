import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-177',
  name: '내용을 쓰다 다른 화면으로 가려 하면 브라우저 「사이트에서 나가시겠습니까?」 확인이 뜬다',
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
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('제목을 적다 다른 화면으로 가려 한다', async () => {
    await 쓰기.제목칸.click();
    await 쓰기.제목칸.fill('쓰다가 나가는 제목');
    const 창 = page.waitForEvent('dialog');
    const 누름 = 쓰기.취소.click();
    const 나감확인 = await 창;
    const 종류 = 나감확인.type();
    await 나감확인.dismiss();
    await 누름;
    await verify('내용을 쓰다 다른 화면으로 가려 하면 브라우저 「사이트에서 나가시겠습니까?」 확인이 뜬다', 종류, 'beforeunload');
  });
});
