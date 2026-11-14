import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 암호만들기 } from './helpers/text-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기 } from './helpers/page-setup.helper.js';
import { 암호와보안화면 } from './pages/auth-settings.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-746',
  name: '새 암호를 7자로 넣고 저장하면 암호가 바뀌지 않는다',
  precondition: ['일회용 · 암호 변경 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    changeId: z.string().describe('일회용 · 암호 변경 계정 이메일').optional().meta({ secret: true, account: '일회용 · 암호 변경' }),
    changePassword: z.string().describe('일회용 · 암호 변경 계정 암호').optional().meta({ secret: true, account: '일회용 · 암호 변경' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 암호와보안화면(page);
  const 아이디 = params.changeId ?? '';
  const 원래암호 = params.changePassword ?? '';
  let 현재암호 = 원래암호;

  await test.step('일회용 · 암호 변경 계정으로 로그인해 암호 및 보안을 연다', async () => {
    await 로그인하기(page, params.changeId, params.changePassword);
    await 설정.열기();
    await verify('암호 및 보안 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('암호 및 보안에서 새 암호를 7자로 넣고 저장한다', async () => {
      await 설정.암호바꾸고저장(현재암호, 암호만들기(7));
      const 창 = await 새창열기(page);
      try {
        await verify('새 암호를 7자로 넣고 저장하면 암호가 바뀌지 않는다', await new 로그인화면(창.page).로그인되는가(아이디, 원래암호), true);
      } finally {
        await 창.창묶음.close();
      }
    });

    await test.step('암호 및 보안에서 새 암호를 8자로 넣고 저장한다', async () => {
      await 설정.열기();
      const 새암호 = 암호만들기(8);
      await 설정.암호바꾸고저장(현재암호, 새암호);
      await 설정.틀.성공안내.waitFor();
      현재암호 = 새암호;
      const 창 = await 새창열기(page);
      try {
        await verify('8자 새 암호는 저장된다', await new 로그인화면(창.page).로그인되는가(아이디, 새암호), true);
      } finally {
        await 창.창묶음.close();
      }
    });

    await test.step('암호 및 보안에서 새 암호를 72자로 넣고 저장한다', async () => {
      await 설정.열기();
      const 새암호 = 암호만들기(72);
      await 설정.암호바꾸고저장(현재암호, 새암호);
      await 설정.틀.성공안내.waitFor();
      현재암호 = 새암호;
      const 창 = await 새창열기(page);
      try {
        await verify('72자 새 암호도 저장된다', await new 로그인화면(창.page).로그인되는가(아이디, 새암호), true);
      } finally {
        await 창.창묶음.close();
      }
    });
  } finally {
    if (현재암호 !== 원래암호) {
      await 설정.열기();
      await 설정.암호바꾸고저장(현재암호, 원래암호);
      await 설정.틀.성공안내.waitFor();
    }
  }
});
