import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-027',
  name: '대시보드에서 왼쪽 메뉴 「유저 · 제재」를 누르면 /users 로 간다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('운영자 계정으로 로그인하고 대시보드를 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    await verify('머리줄에 운영자 이름이 보인다', await 대시보드.틀.운영자.isVisible(), true, { blocker: true });
  });

  await test.step('왼쪽 메뉴 「유저 · 제재」를 누른다', async () => {
    await 대시보드.틀.메뉴누르기('유저 · 제재');
    await verify('대시보드에서 왼쪽 메뉴 「유저 · 제재」를 누르면 /users 로 간다', new URL(page.url()).pathname, '/users');
  });

  await test.step('왼쪽 메뉴 「지급 · 회수」를 누른다', async () => {
    await 대시보드.틀.메뉴누르기('지급 · 회수');
    await verify('「지급 · 회수」 메뉴는 /grants 로 간다', new URL(page.url()).pathname, '/grants');
  });

  await test.step('왼쪽 메뉴 「공지」를 누른다', async () => {
    await 대시보드.틀.메뉴누르기('공지');
    await verify('「공지」 메뉴는 /notices 로 간다', new URL(page.url()).pathname, '/notices');
  });

  await test.step('왼쪽 메뉴 「점검」을 누른다', async () => {
    await 대시보드.틀.메뉴누르기('점검');
    await verify('「점검」 메뉴는 /maintenance 로 간다', new URL(page.url()).pathname, '/maintenance');
  });

  await test.step('왼쪽 메뉴 「기록」을 누른다', async () => {
    await 대시보드.틀.메뉴누르기('기록');
    await verify('「기록」 메뉴는 /logs 로 간다', new URL(page.url()).pathname, '/logs');
  });

  await test.step('왼쪽 메뉴 「대시보드」를 누른다', async () => {
    await 대시보드.틀.메뉴누르기('대시보드');
    await verify('「대시보드」 메뉴는 / 로 간다', new URL(page.url()).pathname, '/');
  });
});
