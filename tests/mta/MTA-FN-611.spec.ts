import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 주소열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-611',
  name: '없는 글 상세를 열면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 앱에서 없는 글 상세를 바로 열 길이 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    없는글주소: z.string().describe('우리 서버에 없는 글의 주소'),
  }),
  expected: z.object({
    안내글: z.string().describe('없는 글 상세의 안내').default('삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 창 = new 확인창(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('없는 글 주소로 글 상세를 연다', async () => {
    await 주소열기(driver, params.없는글주소);
    await verify('없는 글 상세를 열면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', await 뜰때까지(driver, 창.안의글자(expected.안내글), 15_000), true);
  });
});
