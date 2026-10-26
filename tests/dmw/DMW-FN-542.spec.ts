import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-542',
  name: '프로필 사진으로 2MB 를 넘는 png 를 올리면 「2MB 이하 파일만 올릴 수 있습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    사진한도밖바이트: z.number().int().min(2097153).describe('한도를 넘겨 올리는 png 크기(바이트) — 2097153 이상').default(2097153),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 회원정보수정화면(page);
  const 알림 = new 토스트(page);
  let 회원 = { loginId: '', password: '' };

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원 = await 일회용회원으로로그인(page);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
  });

  await test.step('회원정보 수정에서 비밀번호를 확인한다', async () => {
    await 화면.열기();
    await 화면.수정칸까지(회원.password);
    await verify('프로필 사진 미리보기가 보인다', await 화면.사진미리보기.isVisible(), true, { blocker: true });
  });

  await test.step('2MB 를 넘는 png 사진을 올린 뒤 안내를 확인한다', async () => {
    await 화면.사진올리기('초과.png', params.사진한도밖바이트);
    await 두프레임기다리기(page);
    await verify('프로필 사진으로 2MB 를 넘는 png 를 올리면 「2MB 이하 파일만 올릴 수 있습니다」가 보인다', await 알림.글('2MB 이하 파일만 올릴 수 있습니다').first().isVisible(), true);
  });
});
