import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 해시태그상세화면 } from './pages/tag-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-156',
  name: '해시태그 상세에 「표시 이름」 칸과 허용 체크박스 셋, 「변경 사항을 저장」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 상세 = new 해시태그상세화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「#가을」 해시태그 상세를 연다', async () => {
    await 상세.이름으로찾아열기('가을');
    const 이름칸 = await verify('「표시 이름」 칸이 보인다', await 상세.표시이름칸.isVisible(), true);
    const 사용 = await verify('로컬 게시물 사용 허용 체크박스가 보인다', await 상세.사용허용.isVisible(), true);
    const 유행 = await verify('유행 허용 체크박스가 보인다', await 상세.유행허용.isVisible(), true);
    const 추천 = await verify('검색과 추천 허용 체크박스가 보인다', await 상세.추천허용.isVisible(), true);
    const 저장 = await verify('「변경 사항을 저장」이 보인다', await 상세.저장.isVisible(), true);
    await verify('해시태그 상세에 「표시 이름」 칸과 허용 체크박스 셋, 「변경 사항을 저장」이 보인다', 이름칸 && 사용 && 유행 && 추천 && 저장, true);
  });
});
