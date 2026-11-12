import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 해시태그상세화면 } from './pages/tag-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-382',
  name: '해시태그 행을 누르면 제목 「#가을」 상세에 「공개시점으로 보기」와 「고유한 사용」 · 「총 사용」 · 「다른 서버들」 타일이 보인다',
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
  await test.step('「해시태그」 목록에서 「가을」을 찾아 행을 누른다', async () => {
    await 상세.이름으로찾아열기('가을');
    const 제목 = await verify('제목이 「#가을」이다', (await 상세.제목.innerText()).trim(), '#가을');
    const 공개 = await verify('「공개시점으로 보기」가 보인다', await 상세.공개시점으로보기.isVisible(), true);
    const 고유 = await verify('「고유한 사용」 타일이 보인다', await 상세.타일('고유한 사용').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 총 = await verify('「총 사용」 타일이 보인다', await 상세.타일('총 사용').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 다른 = await verify('「다른 서버들」 타일이 보인다', await 상세.타일('다른 서버들').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    await verify('해시태그 행을 누르면 제목 「#가을」 상세에 「공개시점으로 보기」와 「고유한 사용」 · 「총 사용」 · 「다른 서버들」 타일이 보인다', 제목 && 공개 && 고유 && 총 && 다른, true);
  });
});
