import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 크기맞춘PNG } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-590',
  name: '8MB 이미지를 프로필 사진으로 올리면 받아들여진다',
  techniques: ['경계값 분석'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 편집 = new 프로필편집화면(page);

  await test.step('두 번째 사용자로 로그인하고 프로필 편집 화면을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 편집.열기();
    await verify('프로필 편집 화면에 「프로필 편집」 제목이 보인다', await 편집.제목.isVisible(), true, { blocker: true });
  });

  await test.step('프로필 편집에서 8MB 이미지를 프로필 사진으로 올린다', async () => {
    await 편집.사진창열기();
    await 편집.파일칸.setInputFiles(크기맞춘PNG(8 * 1024 * 1024));
    const 받아들임 = await 편집.다음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('8MB 이미지를 프로필 사진으로 올리면 받아들여진다', 받아들임, true);
    await 편집.창닫기();
  });

  await test.step('프로필 편집에서 8MB 를 넘는 이미지를 프로필 사진으로 올린다', async () => {
    await 편집.사진창열기();
    await 편집.파일칸.setInputFiles(크기맞춘PNG(8 * 1024 * 1024 + 1));
    const 받아들임 = await 편집.다음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('8MB 를 넘는 이미지는 프로필 사진으로 받아들여지지 않는다', 받아들임, false);
    await 편집.창닫기();
  });
});
