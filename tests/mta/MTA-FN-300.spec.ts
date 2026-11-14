import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-300',
  name: '삭제되었거나 접근할 수 없는 글 상세를 열면 404 문구 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다',
  platforms: ['android'],
  held: '보류 — 없는 글 주소를 앱에서 여는 길',
  techniques: ['동등 분할'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에서 없는 글 주소를 연다', async () => {
    await verify('삭제되었거나 접근할 수 없는 글 상세를 열면 404 문구 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', await 문구가보이나(driver, '삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.'), true);
  });
});
