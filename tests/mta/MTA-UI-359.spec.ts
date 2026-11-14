import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록편집화면 } from './pages/list-edit.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-359',
  name: '목록 편집(「목록 관리」)에 이름 · 답장 정책 · 숨기기 스위치 · 「리스트 구성원」 · 「리스트 삭제」가 보인다',
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
  const 편집 = new 목록편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 목록 관리를 연다', async () => {
    await 관리.홈에서열기();
    await verify('목록 관리 화면에 「목록 만들기」 단추가 보인다', await 관리.떴나(), true, { blocker: true });
  });
  await test.step('목록 관리에서 「개발 소식」 편집을 연다', async () => {
    await 관리.편집열기('개발 소식');
    await verify('목록 편집 화면이 보인다', await 편집.떴나(), true);
    const 제목 = await verify('화면 제목 「목록 관리」가 보인다', await 편집.글자보이나('목록 관리'), true);
    const 이름 = await verify('목록 이름 「개발 소식」이 보인다', await 편집.글자보이나('개발 소식'), true);
    const 답장 = await verify('답장 정책 「답장을 표시할 대상:」이 보인다', await 편집.글자보이나('답장을 표시할 대상:'), true);
    const 숨기기 = await verify('스위치 「팔로우 중인 구성원 숨기기」가 보인다', await 편집.글자보이나('팔로우 중인 구성원 숨기기'), true);
    const 구성원 = await verify('「리스트 구성원」이 보인다', await 편집.글자보이나('리스트 구성원'), true);
    const 삭제 = await verify('「리스트 삭제」가 보인다', await 편집.글자보이나('리스트 삭제'), true);
    await verify('목록 편집(「목록 관리」)에 이름 · 답장 정책 · 숨기기 스위치 · 「리스트 구성원」 · 「리스트 삭제」가 보인다', 제목 && 이름 && 답장 && 숨기기 && 구성원 && 삭제, true);
  }, { capture: true });
});
