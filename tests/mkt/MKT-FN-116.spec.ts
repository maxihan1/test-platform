import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-116',
  name: '「위 내용을 확인했습니다」 를 켜지 않으면 「탈퇴하기」 가 눌리지 않는다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
  ],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 탈퇴 = new 회원탈퇴화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원 탈퇴 화면을 연다', async () => {
    await 탈퇴.열기();
    await verify('「위 내용을 확인했습니다」 를 켜지 않으면 「탈퇴하기」 가 눌리지 않는다', await 탈퇴.탈퇴하기버튼.isDisabled(), true);
  });

  await test.step('「위 내용을 확인했습니다」 를 켠다', async () => {
    await 탈퇴.확인체크.check();
    await verify('「위 내용을 확인했습니다」 를 켜면 「탈퇴하기」 가 눌린다', await 탈퇴.탈퇴하기버튼.isEnabled(), true);
  });
});
