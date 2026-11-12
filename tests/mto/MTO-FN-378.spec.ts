import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 그림만들기, 에모지정리, 에모지코드 } from './helpers/settings-data.helper.js';
import { 커스텀에모지추가화면 } from './pages/custom-emoji-new.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-378',
  name: '일괄 동작 권한이 없는 역할이 에모지를 선택해 「비활성화」를 누르면 「이 작업을 수행할 권한이 없습니다」가 보인다',
  precondition: ['커스텀 에모지 화면만 볼 수 있는 역할 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    roleId: z.string().describe('커스텀 에모지 화면만 볼 수 있는 역할 아이디').optional().meta({ secret: true, account: '커스텀 에모지 화면만 볼 수 있는 역할' }),
    rolePassword: z.string().describe('커스텀 에모지 화면만 볼 수 있는 역할 비밀번호').optional().meta({ secret: true, account: '커스텀 에모지 화면만 볼 수 있는 역할' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 추가 = new 커스텀에모지추가화면(page);
  const 목록 = new 커스텀에모지화면(page);

  await test.step('커스텀 에모지 화면만 볼 수 있는 역할 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.roleId, params.rolePassword);
    await 프로필.열기();
    await verify('커스텀 에모지 화면만 볼 수 있는 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  const 코드 = 에모지코드(10);
  try {
    await test.step('그 역할로 에모지를 업로드한다', async () => {
      await 추가.올리기(코드, 그림만들기());
    });
    await test.step('그 역할로 업로드한 에모지가 있는지 확인한다', async () => {
      await 목록.열기();
      await verify('그 역할로 업로드한 에모지가 있다', await 목록.에모지줄(코드).count(), 1, { blocker: true });
    });
    await test.step('그 역할로 업로드한 에모지를 선택하고 「비활성화」를 누른다', async () => {
      await 목록.선택해서누르기(코드, 목록.비활성화);
      const 보인다 = await 목록.권한없음안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('일괄 동작 권한이 없는 역할이 에모지를 선택해 「비활성화」를 누르면 「이 작업을 수행할 권한이 없습니다」가 보인다', 보인다, true);
    });
  } finally {
    await 에모지정리(page, 코드);
  }
});
