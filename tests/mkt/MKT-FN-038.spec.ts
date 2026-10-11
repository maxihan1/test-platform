import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 잠긴아이디 } from './helpers/account.helper.js';
import { 아이디가있는가 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-038',
  name: '잠긴 계정으로 맞는 비밀번호를 넣어도 「로그인 5회 실패로 10분간 로그인할 수 없습니다」 가 보이고 로그인되지 않는다',
  platforms: ['desktop'],
  precondition: [
    '잠긴 회원 계정을 쓴다',
  ],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('잠긴 회원 아이디와 맞는 비밀번호로 「로그인」 을 누른다', async () => {
    await verify('잠긴 회원 아이디가 있다', await 아이디가있는가(request, 잠긴아이디), true, { blocker: true });
    await 로그인.열기();
    await 로그인.입력하기(잠긴아이디, params.password ?? '');
    await 로그인.응답받으며누르기();
    await 로그인.오류문구.filter({ hasText: /\S/ }).waitFor();
    await verify(
      '잠긴 계정으로 맞는 비밀번호를 넣어도 「로그인 5회 실패로 10분간 로그인할 수 없습니다」 가 보이고 로그인되지 않는다',
      { 문구: await 로그인.오류문구.innerText(), 로그인됨: await 머리.로그아웃버튼.isVisible() },
      { 문구: '로그인 5회 실패로 10분간 로그인할 수 없습니다', 로그인됨: false },
    );
  });
});
