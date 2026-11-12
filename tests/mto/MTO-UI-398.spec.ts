import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 열초안에결말 } from './helpers/report-data.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행게시물화면 } from './pages/trends-statuses.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-398',
  name: '유행하는 게시물에서 「게시물 허용」을 누르면 「정말로 선택된 게시물들을 허용하시겠습니까?」 확인 창이 뜬다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '대기 중 유행 게시물이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 유행게시물 = new 유행게시물화면(page);

  await test.step('Owner 계정으로 로그인하고 「유행하는 게시물」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    await 유행게시물.열기();
    await verify('대기 중 유행 게시물이 있다', await 유행게시물.대기게시물선택칸.isVisible(), true, { blocker: true });
  });

  await test.step('「유행하는 게시물」에서 게시물 하나를 선택하고 「게시물 허용」을 누른 뒤 확인 창에서 취소한다', async () => {
    await 유행게시물.대기게시물선택칸.check();
    const 창 = 확인창받기(page, '취소');
    await 유행게시물.게시물허용.click();
    const 글 = await 열초안에결말(창);
    await verify('유행하는 게시물에서 「게시물 허용」을 누르면 「정말로 선택된 게시물들을 허용하시겠습니까?」 확인 창이 뜬다', 글, '정말로 선택된 게시물들을 허용하시겠습니까?');
  });
});
