import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록타임라인화면 } from './pages/list-timeline.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-354',
  name: '목록 타임라인에 목록 글이 보이고 메뉴에 「리스트 구성원」 · 「목록 관리」가 있다',
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
  const 타임라인 = new 목록타임라인화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 드롭다운 「목록」에서 「개발 소식」을 고르고 메뉴를 연다', async () => {
    await 타임라인.홈에서열기('개발 소식');
    const 글 = await verify('목록 타임라인에 목록 글이 보인다', await 타임라인.글보이나(), true);
    const 항목들 = await 타임라인.메뉴항목들();
    const 구성원 = await verify('메뉴에 「리스트 구성원」이 있다', 항목들.includes('리스트 구성원'), true);
    const 관리 = await verify('메뉴에 「목록 관리」가 있다', 항목들.includes('목록 관리'), true);
    await verify('목록 타임라인에 목록 글이 보이고 메뉴에 「리스트 구성원」 · 「목록 관리」가 있다', 글 && 구성원 && 관리, true);
  }, { capture: true });
});
