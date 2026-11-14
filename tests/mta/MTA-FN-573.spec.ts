import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 토스트 } from './components/toast.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-573',
  name: '404면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    없는글주소: z.string().describe('검색창에 적을 글 주소 — 이 서버의 글 주소 꼴이고 글이 없는 번호').default('https://mastodon.maxihan.com/@hana_photo/99999999999999999'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);
  const 토스트창 = new 토스트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에서 없는 글 주소를 열고 「마스토돈에서 URL 열기」를 누른다', async () => {
    await 검색.열기();
    await 검색.적기(params.없는글주소);
    await 검색.줄누르기('마스토돈에서 URL 열기');
    const 판정1 = await verify('화면에 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', await 문구가보이나(driver, '삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.'), true);
    const 판정2 = await verify('토스트 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', await 토스트창.글(), '삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.');
    await verify('404면 「삭제되었거나 아마도 원래 존재하지 않았던 것 같습니다.」가 보인다', 판정1 || 판정2, true);
  }, { capture: true });
});
