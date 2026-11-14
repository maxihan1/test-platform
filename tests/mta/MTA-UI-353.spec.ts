import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-353',
  name: '목록 관리 화면(「목록 관리」)에 목록 줄(옵션 메뉴 「목록 관리」 · 「리스트 삭제」)과 「목록 만들기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 목록관리화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 드롭다운 「목록」에서 「목록 관리」를 누른다', async () => {
    await 관리.홈에서열기();
    const 만들기 = await verify('「목록 만들기」 단추가 보인다', await 관리.떴나(), true);
    const 제목 = await verify('화면 제목 「목록 관리」가 보인다', await 관리.제목보이나(), true);
    const 줄 = await verify('목록 줄이 한 줄 이상 보인다', (await 관리.줄이름들()).length > 0, true);
    const 항목들 = await 관리.옵션메뉴글자('개발 소식');
    const 관리항목 = await verify('옵션 메뉴에 「목록 관리」가 있다', 항목들.includes('목록 관리'), true);
    const 삭제항목 = await verify('옵션 메뉴에 「리스트 삭제」가 있다', 항목들.includes('리스트 삭제'), true);
    await verify('목록 관리 화면(「목록 관리」)에 목록 줄(옵션 메뉴 「목록 관리」 · 「리스트 삭제」)과 「목록 만들기」가 보인다', 만들기 && 제목 && 줄 && 관리항목 && 삭제항목, true);
  }, { capture: true });
});
