import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-426',
  name: '필터를 저장 없이 나가면 「변경 사항을 지우시겠습니까?」를 묻는다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 필터목록 = new 필터목록화면(driver);
  const 편집 = new 필터편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 필터 목록을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('필터');
    await verify('필터 목록에 「필터 추가」 단추가 보인다', await 필터목록.떴나(), true, { blocker: true });
  });
  await test.step('필터 목록에서 필터 추가 화면을 연다', async () => {
    await 필터목록.추가누르기();
    await verify('필터 편집 화면에 「기간」 줄이 보인다', await 편집.떴나(), true, { blocker: true });
  });
  await test.step('필터 추가에서 제목을 적고 저장 없이 나간다', async () => {
    await 편집.제목적기('mta필터');
    await 편집.나가기시도();
    await verify('필터를 저장 없이 나가면 「변경 사항을 지우시겠습니까?」를 묻는다', await 편집.글보이나('변경 사항을 지우시겠습니까?'), true);
    await 편집.변경버리고나가기();
  }, { capture: true });
});
