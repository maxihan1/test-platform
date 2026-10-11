import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인, API로그인, 새계정가입 } from './helpers/account.helper.js';
import { 새계정치우기, 틀린비밀번호 } from './helpers/member.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-131',
  name: '잠긴 회원 줄의 「잠금 해제」 를 누르면 상태가 「정상」 으로 바뀐다',
  platforms: ['desktop'],
  precondition: [
    '관리자로 로그인해 있다',
  ],
  techniques: ['상태 전이'],
  held: '보류 — 관리자 계정이 없다',
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  const 머리 = new 머리글(page);
  let 계정: Awaited<ReturnType<typeof 새계정가입>> | undefined;

  try {
    await 방해막기(page);

    await test.step('새 아이디로 계정을 만들어 비밀번호를 5번 틀려 잠근다', async () => {
      계정 = await 새계정가입(request);
      const 상태들: number[] = [];
      for (let 번 = 0; 번 < 5; 번 += 1) 상태들.push(await API로그인(request, 계정.loginId, 틀린비밀번호));
      await verify('새 계정이 잠겼다', 상태들[4], 423, { blocker: true });
    });

    await test.step('관리자로 로그인한다', async () => {
      await 화면로그인(page, params.adminLoginId, params.adminPassword ?? '');
      await 머리.관리자링크.waitFor();
      await verify('머리글에 「관리자」 링크가 보인다', await 머리.관리자링크.isVisible(), true, { blocker: true });
    });

    await test.step('회원 관리에서 잠긴 회원 줄의 「잠금 해제」 를 누른다', async () => {
      if (계정 === undefined) throw new Error('새 계정이 만들어지지 않았다');
      await 관리자.열기();
      await 관리자.탭('회원 관리').click();
      await 관리자.아이디검색칸.fill(계정.loginId);
      await 관리자.잠금해제버튼(계정.loginId).click();
      await 알림.글('잠금이 해제되었습니다').waitFor();
      await verify('잠긴 회원 줄의 「잠금 해제」 를 누르면 상태가 「정상」 으로 바뀐다', await 관리자.정상상태칸(계정.loginId).isVisible(), true);
    });
  } finally {
    if (계정 !== undefined) await 새계정치우기(request, { loginId: 계정.loginId, password: 계정.password });
  }
});
