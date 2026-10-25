import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-290',
  name: '프로필 사진으로 2MB png 를 올리면 미리보기가 바뀐다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    사진한도안바이트: z.number().int().min(100).describe('올리는 png 크기(바이트) — 100 이상 2097152 이하').default(2097152),
    사진한도밖바이트: z.number().int().min(2097153).describe('한도를 넘겨 올리는 png 크기(바이트) — 2097153 이상').default(2097153),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 회원정보수정화면(page);
  const 알림 = new 토스트(page);
  let 회원 = { loginId: '', password: '' };
  let 처음그림 = '';

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
    처음그림 = await 화면.사진미리보기주소();
    await verify('프로필 사진 미리보기가 보인다', await 화면.사진미리보기.isVisible(), true, { blocker: true });
  });

  await test.step('2MB png 사진을 올린다', async () => {
    await 화면.사진올리기('경계.png', params.사진한도안바이트);
    await 화면.올린사진미리보기.waitFor();
    await verify('프로필 사진으로 2MB png 를 올리면 미리보기가 바뀐다', (await 화면.사진미리보기주소()) !== 처음그림, true);
  });

  await test.step('2MB 를 넘는 png 사진을 올린다', async () => {
    const 올린그림 = await 화면.사진미리보기주소();
    await 화면.사진올리기('초과.png', params.사진한도밖바이트);
    await 알림.글('2MB 이하 파일만 올릴 수 있습니다').first().waitFor();
    await verify('프로필 사진으로 2MB 를 넘는 png 를 올리면 미리보기가 바뀌지 않는다', (await 화면.사진미리보기주소()) === 올린그림, true);
  });
});
