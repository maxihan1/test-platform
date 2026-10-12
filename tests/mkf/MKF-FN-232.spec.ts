import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인, 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-232',
  name: '「아이디 검색」에 아이디를 적으면 그 회원 줄이 보이고 표 위 「총 {N}명」이 바뀐다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호가 테스트 계정 환경 변수에 없다',
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 관리 = new 관리자화면(page);
  const 찾을회원 = 새회원정보();

  try {
    await test.step('검색할 회원을 가입시킨다', async () => {
      await 회원가입(request, 찾을회원);
    });

    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      const 계정 = 관리자값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
    });

    await test.step('회원 관리 「아이디 검색」 칸에 아이디를 적는다', async () => {
      await 관리.열기();
      await 관리.회원관리탭.click();
      await 관리.총인원.waitFor();
      const 전 = await 관리.총인원.innerText();
      await 관리.아이디검색.fill(찾을회원.loginId);
      await 관리.회원줄(찾을회원.loginId).waitFor();
      const 후 = await 관리.총인원.innerText();
      await verify(
        '「아이디 검색」에 아이디를 적으면 그 회원 줄이 보이고 표 위 「총 {N}명」이 바뀐다',
        [await 관리.회원줄(찾을회원.loginId).isVisible(), 후 !== 전, 후 === `총 ${String(await 관리.회원줄들.count())}명`],
        [true, true, true],
      );
    });
  } finally {
    await API로그아웃(page.request);
    await 가입자정리하기(request, 찾을회원);
  }
});
