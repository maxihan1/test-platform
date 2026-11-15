import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 서버 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주소열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-599',
  name: '지운 글 상세를 열면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다',
  platforms: ['android'],
  held: '보류 — 앱에서 지운 글의 상세를 다시 열 길이 없다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('지운 글 상세를 연다', async () => {
    await 주소열기(driver, `https://${서버}/@qa_user1/0`);
    await verify('지운 글 상세를 열면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', await 뜰때까지(driver, 홈.전체글자포함('삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.'), 15_000), true);
  });
});
