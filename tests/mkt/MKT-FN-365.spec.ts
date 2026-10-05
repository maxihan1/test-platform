import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { MB, png파일 } from './components/files.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 바이트수 } from './components/member-helpers.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-365',
  name: '2MB 사진을 올리면 미리보기가 그 사진으로 바뀐다',
  techniques: ['경계값 분석'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '비밀번호 재확인을 마쳤다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 헤더 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(page.request, 회원);
      await API로그인(page.request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('회원정보 수정 화면에서 비밀번호를 다시 입력한다', async () => {
      await 화면.열기();
      await 화면.재확인하기(회원.password);
    });

    await test.step('비밀번호 재확인을 마쳤는지 확인한다', async () => {
      await verify('비밀번호 재확인을 마치면 회원정보 수정 칸이 열린다', await 화면.이름칸.isVisible(), true, { blocker: true });
    });

    await test.step('프로필 사진에 2MB 짜리 png 를 올린다', async () => {
      const 이전 = await 화면.미리보기주소();
      await 화면.사진올리기(png파일('profile-2mb.png', 2 * MB));
      await 화면.미리보기바뀌기기다리기(이전);
      const 바뀐주소 = await 화면.미리보기주소();
      await verify(
        '2MB 사진을 올리면 미리보기가 그 사진으로 바뀐다',
        { 형식: 바뀐주소.startsWith('data:image/png'), 바이트: 바이트수(바뀐주소) },
        { 형식: true, 바이트: 2 * MB },
      );
    });

    await test.step('프로필 사진에 2MB 를 넘는 png 를 올린다', async () => {
      const 이전 = await 화면.미리보기주소();
      await 화면.사진올리기(png파일('profile-over.png', 2 * MB + 1));
      await 알림.기다리기('2MB 이하 파일만 올릴 수 있습니다');
      await verify('2MB 를 넘는 사진은 올라가지 않아 미리보기가 바뀌지 않는다', await 화면.미리보기주소(), 이전);
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
