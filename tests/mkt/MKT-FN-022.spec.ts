import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-022',
  name: '회원 관리 표는 칸 제목으로 정렬하고 스크롤로 보며 아이디로 찾을 수 있다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);
  const 순서 = new Intl.Collator('ko').compare;

  await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
    await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('회원 관리 표의 칸 제목을 한 번 누른다', async () => {
    await 관리자.열기();
    await 관리자.칸제목('아이디').click();
    const 아이디들 = await 관리자.아이디칸들.allInnerTexts();
    await verify(
      '칸 제목을 누르면 그 칸 기준 오름차순으로 정렬되고 제목 옆에 ▲가 나온다',
      [await 관리자.칸제목('아이디').innerText(), 아이디들.join(',') === [...아이디들].sort(순서).join(',')],
      ['아이디 ▲', true],
    );
  });

  await test.step('회원 관리 표의 같은 칸 제목을 두 번 누른다', async () => {
    await 관리자.열기();
    await 관리자.칸제목('아이디').click();
    await 관리자.칸제목('아이디').click();
    const 아이디들 = await 관리자.아이디칸들.allInnerTexts();
    await verify(
      '같은 칸 제목을 다시 누르면 내림차순으로 정렬되고 제목 옆에 ▼가 나온다',
      [await 관리자.칸제목('아이디').innerText(), 아이디들.join(',') === [...아이디들].sort(순서).reverse().join(',')],
      ['아이디 ▼', true],
    );
  });

  await test.step('회원 관리 목록을 아래로 스크롤한다', async () => {
    const 총 = Number((await 관리자.총인원.innerText()).replace(/\D/g, ''));
    const 처음 = await 관리자.아이디칸들.first().innerText();
    await 관리자.회원목록을내린다(20000);
    const 바뀜 = await 관리자.첫아이디가바뀔때까지기다린다(처음);
    await verify(
      '회원 목록은 1,000명 이상이어도 한 화면(높이 600px) 안에서 스크롤로 본다',
      [await 관리자.회원목록영역높이(), 총 >= 1000, 바뀜],
      [600, true, true],
    );
  });

  await test.step('위쪽 「아이디 검색」 칸에 아이디를 적는다', async () => {
    await 관리자.아이디검색.fill('member0123');
    const 찾음 = await 관리자.회원줄('member0123').waitFor({ state: 'visible', timeout: 5000 }).then(
      () => true,
      () => false,
    );
    await verify('「아이디 검색」 칸에 아이디를 적으면 그 회원을 찾을 수 있다', 찾음, true);
  });
});
