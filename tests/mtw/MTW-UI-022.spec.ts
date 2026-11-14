import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings-menu.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-022',
  name: '설정 화면 왼쪽 메뉴에 「마스토돈으로 돌아가기」 · 「공개 프로필」 · 「개인정보와 도달」 · 「환경설정」 · 「팔로잉과 팔로워」 · 「필터」 · 「게시물 자동 삭제」 · 「계정」 · 「가져오기 & 내보내기」 · 「초대」 · 「개발」 · 「로그아웃」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 설정 = new 설정화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('설정 화면을 연다', async () => {
    await 설정.열기();
    const 돌아가기 = await verify('설정 화면 왼쪽 메뉴에 「마스토돈으로 돌아가기」가 보인다', await 설정.항목('마스토돈으로 돌아가기').isVisible(), true);
    const 프로필 = await verify('설정 화면 왼쪽 메뉴에 「공개 프로필」가 보인다', await 설정.항목('공개 프로필').isVisible(), true);
    const 도달 = await verify('설정 화면 왼쪽 메뉴에 「개인정보와 도달」가 보인다', await 설정.항목('개인정보와 도달').isVisible(), true);
    const 환경설정 = await verify('설정 화면 왼쪽 메뉴에 「환경설정」가 보인다', await 설정.항목('환경설정').isVisible(), true);
    const 팔로잉 = await verify('설정 화면 왼쪽 메뉴에 「팔로잉과 팔로워」가 보인다', await 설정.항목('팔로잉과 팔로워').isVisible(), true);
    const 필터 = await verify('설정 화면 왼쪽 메뉴에 「필터」가 보인다', await 설정.항목('필터').isVisible(), true);
    const 삭제 = await verify('설정 화면 왼쪽 메뉴에 「게시물 자동 삭제」가 보인다', await 설정.항목('게시물 자동 삭제').isVisible(), true);
    const 계정 = await verify('설정 화면 왼쪽 메뉴에 「계정」가 보인다', await 설정.항목('계정').isVisible(), true);
    const 가져오기 = await verify('설정 화면 왼쪽 메뉴에 「가져오기 & 내보내기」가 보인다', await 설정.항목('가져오기 & 내보내기').isVisible(), true);
    const 초대 = await verify('설정 화면 왼쪽 메뉴에 「초대」가 보인다', await 설정.항목('초대').isVisible(), true);
    const 개발 = await verify('설정 화면 왼쪽 메뉴에 「개발」가 보인다', await 설정.항목('개발').isVisible(), true);
    const 로그아웃 = await verify('설정 화면 왼쪽 메뉴에 「로그아웃」가 보인다', await 설정.항목('로그아웃').isVisible(), true);
    await verify(
      '설정 화면 왼쪽 메뉴에 「마스토돈으로 돌아가기」 · 「공개 프로필」 · 「개인정보와 도달」 · 「환경설정」 · 「팔로잉과 팔로워」 · 「필터」 · 「게시물 자동 삭제」 · 「계정」 · 「가져오기 & 내보내기」 · 「초대」 · 「개발」 · 「로그아웃」이 보인다',
      돌아가기 && 프로필 && 도달 && 환경설정 && 팔로잉 && 필터 && 삭제 && 계정 && 가져오기 && 초대 && 개발 && 로그아웃,
      true,
    );
  });
});
