import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { png파일 } from './components/files.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-364',
  name: '「기본 이미지로」를 누르면 미리보기가 기본 사진으로 돌아간다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '비밀번호 재확인을 마쳤다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 헤더 = new 머리글(page);
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

    await test.step('프로필 사진을 올린 뒤 「기본 이미지로」를 누른다', async () => {
      const 기본주소 = await 화면.미리보기주소();
      await 화면.사진올리기(png파일('profile.png'));
      await 화면.미리보기바뀌기기다리기(기본주소);
      await verify('올린 사진으로 미리보기가 바뀐다', (await 화면.미리보기주소()) !== 기본주소, true, { blocker: true });
      await 화면.기본이미지버튼.click();
      await verify('「기본 이미지로」를 누르면 미리보기가 기본 사진으로 돌아간다', await 화면.미리보기주소(), 기본주소);
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
