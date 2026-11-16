import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 목록만들기, 목록지우기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-429',
  name: '「목록에 추가」 화면에 「가 표시되는 목록 관리하기」가 보이고 목록 줄을 누르면 체크가 켜진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('목록에 더할 사용자명 — 내가 팔로우하는 계정').default('mute_jang'),
  }),
  expected: z.object({
    관리글: z.string().describe('목록에 추가 화면 안내의 끝 글').default('가 표시되는 목록 관리하기'),
    메뉴글: z.string().describe('프로필 메뉴 항목').default('목록에서 추가 또는 제거'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 이름 = 표시글('목록');
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('신규 목록 하나를 만든다', async () => {
      await verify('신규 목록이 만들어진다', await 목록만들기(driver, 이름), true, { blocker: true });
    });
    await test.step('팔로우 중인 mute_jang 프로필 메뉴에서 「목록에서 추가 또는 제거」를 누른다', async () => {
      await 프로필열기(driver, params.사용자명);
      await 프로필.메뉴열기();
      await 프로필.메뉴항목누르기(expected.메뉴글);
      await verify('「목록에 추가」 화면에 신규 목록 줄이 보인다', await 뜰때까지(driver, 목록.편집줄(이름), 15_000), true, { blocker: true });
      await verify('신규 목록 줄의 체크가 꺼져 있다', !(await 보이나(driver, 목록.켜진줄(이름))), true, { blocker: true });
    });
    await test.step('팔로우 중인 mute_jang 의 「목록에 추가」 화면에서 새 목록을 켠다', async () => {
      const 안내 = await verify('「목록에 추가」 화면에 「가 표시되는 목록 관리하기」가 보인다', await 뜰때까지(driver, 목록.화면글(expected.관리글), 10_000), true);
      await driver.$(목록.편집줄(이름)).click();
      const 체크 = await verify('목록 줄의 체크가 켜진다', await 뜰때까지(driver, 목록.켜진줄(이름), 10_000), true);
      await verify('「목록에 추가」 화면에 「가 표시되는 목록 관리하기」가 보이고 목록 줄을 누르면 체크가 켜진다', 안내 && 체크, true);
    });
  } finally {
    await 목록지우기(driver, 이름);
  }
});
