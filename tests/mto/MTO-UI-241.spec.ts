import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-241',
  name: '발견하기 탭에 「유행 활성화」 켜짐 · 「사전 리뷰 없이 트렌드에 오르는 것을 허용」 꺼짐과 「추천하지 않음」 배지, 공개 타임라인 칸 넷이 보인다',
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

  await test.step('「발견하기」 탭을 연다', async () => {
    await 설정.열기('discovery');
    const 유행 = await verify('「유행 활성화」가 켜져 있다', await 설정.유행활성화.isChecked(), true);
    const 리뷰 = await verify('「사전 리뷰 없이 트렌드에 오르는 것을 허용」이 꺼져 있다', await 설정.사전리뷰허용.isChecked(), false);
    const 배지 = await verify('「추천하지 않음」 배지가 보인다', await 설정.추천하지않음배지.isVisible(), true);
    const 로컬피드 = await verify('공개 타임라인의 로컬 게시물 실시간 피드 칸이 보인다', await 설정.로컬실시간피드.isVisible(), true);
    const 리모트피드 = await verify('공개 타임라인의 리모트 게시물 실시간 피드 칸이 보인다', await 설정.리모트실시간피드.isVisible(), true);
    const 로컬태그 = await verify('공개 타임라인의 로컬 게시물 해시태그와 링크 피드 칸이 보인다', await 설정.로컬해시태그피드.isVisible(), true);
    const 리모트태그 = await verify('공개 타임라인의 리모트 게시물 해시태그와 링크 피드 칸이 보인다', await 설정.리모트해시태그피드.isVisible(), true);
    await verify('발견하기 탭에 「유행 활성화」 켜짐 · 「사전 리뷰 없이 트렌드에 오르는 것을 허용」 꺼짐과 「추천하지 않음」 배지, 공개 타임라인 칸 넷이 보인다', 유행 && 리뷰 && 배지 && 로컬피드 && 리모트피드 && 로컬태그 && 리모트태그, true);
  });
});
