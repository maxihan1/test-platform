import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 유저화면 } from './pages/users.page.js';
import { 공지화면 } from './pages/notices.page.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 지급화면 } from './pages/grants.page.js';
import { 카드눌러도착보기 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-UI-046',
  name: '대시보드에서 「게임 계정」 카드를 누르면 「유저 · 제재」로 간다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 유저 = new 유저화면(page);
  const 점검 = new 점검화면(page);
  const 공지 = new 공지화면(page);
  const 지급 = new 지급화면(page);

  await test.step('운영자 계정으로 로그인하고 대시보드를 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    await verify('머리줄에 운영자 이름이 보인다', await 대시보드.틀.운영자.isVisible(), true, { blocker: true });
  });

  await test.step('대시보드에서 「게임 계정」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('대시보드에서 「게임 계정」 카드를 누르면 「유저 · 제재」로 간다', await 카드눌러도착보기(page, 대시보드.카드('게임 계정'), 유저.제목, 유저화면.주소), true);
  });

  await test.step('대시보드에서 「캐릭터」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「캐릭터」 카드는 「유저 · 제재」로 간다', await 카드눌러도착보기(page, 대시보드.카드('캐릭터'), 유저.제목, 유저화면.주소), true);
  });

  await test.step('대시보드에서 「정지 중 계정」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「정지 중 계정」 카드는 「유저 · 제재」로 간다', await 카드눌러도착보기(page, 대시보드.카드('정지 중 계정'), 유저.제목, 유저화면.주소), true);
  });

  await test.step('대시보드에서 「채팅 금지 계정」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「채팅 금지 계정」 카드는 「유저 · 제재」로 간다', await 카드눌러도착보기(page, 대시보드.카드('채팅 금지 계정'), 유저.제목, 유저화면.주소), true);
  });

  await test.step('대시보드에서 「점검」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「점검」 카드는 「점검」로 간다', await 카드눌러도착보기(page, 대시보드.카드('점검'), 점검.제목, 점검화면.주소), true);
  });

  await test.step('대시보드에서 「게임에 보이는 공지」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「게임에 보이는 공지」 카드는 「공지」로 간다', await 카드눌러도착보기(page, 대시보드.카드('게임에 보이는 공지'), 공지.제목, 공지화면.주소), true);
  });

  await test.step('대시보드에서 「오늘 지급」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「오늘 지급」 카드는 「지급 · 회수」로 간다', await 카드눌러도착보기(page, 대시보드.카드('오늘 지급'), 지급.제목, 지급화면.주소), true);
  });

  await test.step('대시보드에서 「아직 안 받은 지급 우편」 카드를 누른다', async () => {
    await 대시보드.열기();
    await verify('「아직 안 받은 지급 우편」 카드는 「지급 · 회수」로 간다', await 카드눌러도착보기(page, 대시보드.카드('아직 안 받은 지급 우편'), 지급.제목, 지급화면.주소), true);
  });
});
