import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 해시태그상세화면 } from './pages/tag-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-186',
  name: '대시보드 보기 권한이 있는 Owner 가 해시태그 상세를 열면 「고유한 사용」 · 「총 사용」 · 「다른 서버들」 타일이 보인다',
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
  await test.step('해시태그 「가을」 상세 화면을 연다', async () => {
    await 상세.이름으로찾아열기('가을');
    const 고유 = await verify('「고유한 사용」 타일이 보인다', await 상세.타일('고유한 사용').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 총 = await verify('「총 사용」 타일이 보인다', await 상세.타일('총 사용').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 서버들 = await verify('「다른 서버들」 타일이 보인다', await 상세.타일('다른 서버들').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    await verify('대시보드 보기 권한이 있는 Owner 가 해시태그 상세를 열면 「고유한 사용」 · 「총 사용」 · 「다른 서버들」 타일이 보인다', 고유 && 총 && 서버들, true);
  });
});
