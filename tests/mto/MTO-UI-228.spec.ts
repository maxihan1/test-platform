import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-228',
  name: '서버 설정 화면에 탭 「브랜딩」 · 「정보」 · 「가입」 · 「발견하기」 · 「콘텐츠 보존기한」 · 「외관」과 「변경 사항을 저장」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「서버 설정」 화면을 연다', async () => {
    await 설정.열기();
    const 탭1 = await verify('「브랜딩」 탭이 보인다', await 설정.탭('브랜딩').isVisible(), true);
    const 탭2 = await verify('「정보」 탭이 보인다', await 설정.탭('정보').isVisible(), true);
    const 탭3 = await verify('「가입」 탭이 보인다', await 설정.탭('가입').isVisible(), true);
    const 탭4 = await verify('「발견하기」 탭이 보인다', await 설정.탭('발견하기').isVisible(), true);
    const 탭5 = await verify('「콘텐츠 보존기한」 탭이 보인다', await 설정.탭('콘텐츠 보존기한').isVisible(), true);
    const 탭6 = await verify('「외관」 탭이 보인다', await 설정.탭('외관').isVisible(), true);
    const 저장 = await verify('「변경 사항을 저장」이 보인다', await 설정.저장.isVisible(), true);
    await verify('서버 설정 화면에 탭 「브랜딩」 · 「정보」 · 「가입」 · 「발견하기」 · 「콘텐츠 보존기한」 · 「외관」과 「변경 사항을 저장」이 보인다', 탭1 && 탭2 && 탭3 && 탭4 && 탭5 && 탭6 && 저장, true);
  });
});
