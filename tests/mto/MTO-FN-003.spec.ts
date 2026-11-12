import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 연합화면 } from './pages/instances.page.js';
import { 역할화면 } from './pages/roles.page.js';
import { 서버설정화면 } from './pages/settings.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 업데이트화면 } from './pages/software-updates.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-003',
  name: 'Admin 이 「서버 설정」 · 「역할」 · 「연합」 주소를 열면 화면마다 제목이 보인다',
  precondition: ['Admin 역할 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('Admin 역할 아이디').optional().meta({ secret: true, account: 'Admin' }),
    adminPassword: z.string().describe('Admin 역할 비밀번호').optional().meta({ secret: true, account: 'Admin' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);
  const 역할 = new 역할화면(page);
  const 연합 = new 연합화면(page);
  const 대시보드 = new 대시보드화면(page);
  const 업데이트 = new 업데이트화면(page);

  await test.step('Admin 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.adminId, params.adminPassword);
    await 프로필.열기();
    await verify('Admin 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「서버 설정」 · 「역할」 · 「연합」 주소를 차례로 연다', async () => {
    await 관리.열기(서버설정화면.주소);
    const 서버설정 = await verify('「서버 설정」 화면 제목이 보인다', await 설정.제목.isVisible(), true);
    await 관리.열기(역할화면.주소);
    const 역할제목 = await verify('「역할」 화면 제목이 보인다', await 역할.제목.isVisible(), true);
    await 관리.열기(연합화면.주소);
    const 연합제목 = await verify('「연합」 화면 제목이 보인다', await 연합.제목.isVisible(), true);
    await verify('Admin 이 「서버 설정」 · 「역할」 · 「연합」 주소를 열면 화면마다 제목이 보인다', 서버설정 && 역할제목 && 연합제목, true);
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    await 대시보드.사이드바.그려질때까지();
    const 시데킥 = await verify('사이드바에 「Sidekiq」가 보이지 않는다', await 대시보드.사이드바.메뉴('Sidekiq').isVisible(), false);
    const 피지허로 = await verify('사이드바에 「PgHero」가 보이지 않는다', await 대시보드.사이드바.메뉴('PgHero').isVisible(), false);
    await verify('Admin 의 사이드바에 「Sidekiq」 · 「PgHero」가 보이지 않는다', 시데킥 && 피지허로, true);
  });
  await test.step('주소 /admin/software_updates 를 연다', async () => {
    await 업데이트.열기();
    await verify('업데이트 알림 화면 /admin/software_updates 에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 업데이트.오류.권한없음.isVisible(), true);
  });
});
