import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 회원정보수정화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-329',
  name: '비밀번호가 맞으면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있는 칸이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    새이름: z.string().min(1).max(10).describe('고칠 이름 — 1자에서 10자').default('고친이름'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 수정 = new 회원정보수정화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('회원정보 수정 화면을 연다', async () => {
      await 수정.열기();
    });

    await test.step('회원정보 수정 화면이 열렸는지 확인한다', async () => {
      await verify('비밀번호 입력칸이 보인다', await 수정.비밀번호칸.isVisible(), true, { blocker: true });
    });

    await test.step('회원정보 수정에서 비밀번호를 다시 입력한다', async () => {
      await 수정.비밀번호확인하기(준비.회원?.password ?? '');
      await verify(
        '비밀번호가 맞으면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있는 칸이 보인다',
        { 이름: await 수정.이름칸.isVisible(), 이메일: await 수정.이메일칸.isVisible(), 휴대폰: await 수정.휴대폰칸.isVisible(), 관심분야: await 수정.관심분야.isVisible() },
        { 이름: true, 이메일: true, 휴대폰: true, 관심분야: true },
      );
    });

    await test.step('이름을 고치고 「저장」을 누른다', async () => {
      await 수정.이름바꾸기(params.새이름);
      await 수정.저장하기();
      await 알림.뜰때까지('저장되었습니다');
      await 수정.머리글.좁으면메뉴열기();
      await verify('이름을 고쳐 저장하면 머리글에 고친 「<이름>님」이 보인다', (await 수정.머리글.인사.innerText()).trim(), `${params.새이름}님`);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
