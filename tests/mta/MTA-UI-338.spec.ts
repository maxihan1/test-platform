import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-UI-338',
  name: '프로필 편집에서 헤더 이미지를 누르면 「Replace」 · 「제거」가 뜨고 「제거」를 누르면 「Remove header image?」가 보인다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: z.object({
    교체글: z.string().describe('헤더 이미지 메뉴 항목').default('Replace'),
    제거글: z.string().describe('헤더 이미지 메뉴 항목').default('제거'),
    묻는글: z.string().describe('헤더 제거 확인 글').default('Remove header image?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 창 = new 확인창(driver);
  await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('내 프로필에서 「프로필 편집」을 연다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.동작누르기();
    await verify('프로필 편집 화면이 그려진다', await 편집.그려질때까지(), true, { blocker: true });
  });
  await test.step('프로필 편집에서 헤더 이미지를 누르고 「제거」를 누른다', async () => {
    await driver.$(편집.헤더이미지).click();
    const 교체 = await verify('헤더 이미지 메뉴에 「Replace」가 보인다', await 편집.메뉴.뜰때까지(expected.교체글), true);
    const 제거 = await verify('헤더 이미지 메뉴에 「제거」가 보인다', await 편집.메뉴.뜰때까지(expected.제거글), true);
    await 편집.메뉴.고르기(expected.제거글);
    const 묻기 = await verify('헤더 제거 확인에 「Remove header image?」가 보인다', await 뜰때까지(driver, 창.안의글자(expected.묻는글), 10_000), true);
    await 창.취소();
    await verify('프로필 편집에서 헤더 이미지를 누르면 「Replace」 · 「제거」가 뜨고 「제거」를 누르면 「Remove header image?」가 보인다', 교체 && 제거 && 묻기, true);
  });
});
