import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 해시태그상세화면 } from './pages/tag-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-187',
  name: '대시보드 보기 권한이 없는 역할이 해시태그 상세를 열면 「고유한 사용」 · 「총 사용」 · 「다른 서버들」 타일이 보이지 않는다',
  precondition: ['대시보드 보기 없이 분류 관리만 가진 역할 계정으로 로그인해 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    roleId: z.string().describe('대시보드 보기 없이 분류 관리만 가진 역할 아이디').optional().meta({ secret: true, account: '대시보드 보기 없이 분류 관리만 가진 역할' }),
    rolePassword: z.string().describe('대시보드 보기 없이 분류 관리만 가진 역할 비밀번호').optional().meta({ secret: true, account: '대시보드 보기 없이 분류 관리만 가진 역할' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 상세 = new 해시태그상세화면(page);

  await test.step('대시보드 보기 없이 분류 관리만 가진 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.roleId, params.rolePassword);
    await 프로필.열기();
    await verify('대시보드 보기 없이 분류 관리만 가진 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('해시태그 「가을」 상세 화면을 연다', async () => {
    await 상세.이름으로찾아열기('가을');
    await 상세.스크립트다불러올때까지();
    await verify('해시태그 「가을」 상세가 열려 있다', (await 상세.제목.innerText()).trim(), '#가을', { blocker: true });
    const 고유 = await verify('「고유한 사용」 타일이 보이지 않는다', await 상세.타일('고유한 사용').isVisible(), false);
    const 총 = await verify('「총 사용」 타일이 보이지 않는다', await 상세.타일('총 사용').isVisible(), false);
    const 서버들 = await verify('「다른 서버들」 타일이 보이지 않는다', await 상세.타일('다른 서버들').isVisible(), false);
    await verify('대시보드 보기 권한이 없는 역할이 해시태그 상세를 열면 「고유한 사용」 · 「총 사용」 · 「다른 서버들」 타일이 보이지 않는다', 고유 && 총 && 서버들, true);
  });
});
