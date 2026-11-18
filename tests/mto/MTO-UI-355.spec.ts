import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-355',
  name: 'Moderator 의 사이드바 위쪽에 「마스토돈으로 돌아가기」와 일반 설정 메뉴 「공개 프로필」 · 「개인정보와 도달」 · 「환경설정」 · 「팔로잉과 팔로워」 · 「필터」 · 「게시물 자동 삭제」 · 「계정」 · 「가져오기 & 내보내기」 · 「초대」 · 「개발」이 보인다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다'],
  params: z.object({
    modId: z.string().describe('중재자 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('중재자 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Moderator 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.modId, params.modPassword);
    await 프로필.열기();
    await verify('Moderator(qa_mod) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「신고」 화면과 「대시보드」 화면을 차례로 연다', async () => {
    await 관리.열기('/admin/reports');
    await 관리.사이드바.그려질때까지();
    const 맨위메뉴 = await 관리.사이드바.맨위메뉴이름들();
    await verify('Moderator 의 사이드바 위쪽에 「마스토돈으로 돌아가기」와 일반 설정 메뉴 「공개 프로필」 · 「개인정보와 도달」 · 「환경설정」 · 「팔로잉과 팔로워」 · 「필터」 · 「게시물 자동 삭제」 · 「계정」 · 「가져오기 & 내보내기」 · 「초대」 · 「개발」이 보인다', 맨위메뉴.slice(0, 11).join(', '), '마스토돈으로 돌아가기, 공개 프로필, 개인정보와 도달, 환경설정, 팔로잉과 팔로워, 필터, 게시물 자동 삭제, 계정, 가져오기 & 내보내기, 초대, 개발');
    await verify('사이드바 일반 설정 메뉴 아래에 「추천과 유행」 · 「중재」 · 「관리」 · 「로그아웃」이 차례로 보인다', 맨위메뉴.slice(11).join(', '), '추천과 유행, 중재, 관리, 로그아웃');
    const 중재 = await verify('「중재」 묶음에 「신고」 · 「계정」 · 「해시태그」 · 「감사 로그」만 보인다', (await 관리.묶음메뉴들('중재').allInnerTexts()).map((t) => t.trim()).join(', '), '신고, 계정, 해시태그, 감사 로그');
    await 대시보드.열기();
    await 관리.사이드바.그려질때까지();
    const 관리묶음 = await verify('「관리」 묶음에 「대시보드」만 보인다', (await 관리.묶음메뉴들('관리').allInnerTexts()).map((t) => t.trim()).join(', '), '대시보드');
    await verify('사이드바 「중재」 묶음에 「신고」 · 「계정」 · 「해시태그」 · 「감사 로그」만 보이고 「관리」 묶음에 「대시보드」만 보인다', 중재 && 관리묶음, true);
  });
});
