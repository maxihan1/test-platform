import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 폰상태에서, 뒤로보냈다오기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 가입양식열기, 가입양식채우기 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 가입양식 } from './pages/signup.page.js';
import { 시작화면 } from './pages/start.page.js';

const 뒤로가기 = defineCase({
  tcId: 'MTA-FN-604',
  name: '가입 양식에서 값을 넣다가 뒤로 가면 앞 화면으로 가고 넣던 값이 말없이 사라지지 않는다',
  platforms: ['android'],
  precondition: ['가입 양식에 사용자명 「tc_signup_back」을 적었다'],
  techniques: ['오류 추정'],
  params: z.object({ 사용자명: z.string().min(1).describe('사용자명 칸에 적을 글 — tc_signup 으로 시작').default('tc_signup_back') }),
  expected: null,
});

const 내렸다올리기 = defineCase({
  tcId: 'MTA-FN-605',
  name: '가입 양식에서 앱을 내렸다 올리면 넣던 사용자명이 남아 있다',
  platforms: ['android'],
  precondition: ['가입 양식에 사용자명을 적고 있다'],
  techniques: ['오류 추정'],
  params: z.object({ 사용자명: z.string().min(1).describe('사용자명 칸에 적을 글 — tc_signup 으로 시작').default('tc_signup_bg') }),
  expected: null,
});

const 회전 = defineCase({
  tcId: 'MTA-FN-606',
  name: '가입 양식에서 화면을 세 번 돌리면 넣던 사용자명이 남고 「다음」이 다시 보인다',
  platforms: ['android'],
  precondition: ['가입 양식에 사용자명을 적고 있다'],
  techniques: ['오류 추정'],
  params: z.object({ 사용자명: z.string().min(1).describe('사용자명 칸에 적을 글 — tc_signup 으로 시작').default('tc_signup_rot') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-070',
  name: '가입 양식 — 오류 추정',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [뒤로가기, 내렸다올리기, 회전],
});

test(procedure, async ({ driver }) => {
  const 양식 = new 가입양식(driver);
  const 개인정보 = new 개인정보화면(driver);

  await test.case(뒤로가기, async ({ params }) => {
    await test.step('값을 넣다가 뒤로 가기를 누른다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: params.사용자명 });
      await 양식.키보드내리기();
      await driver.back();
      const 앞화면 = await verify('앞 화면 「개인정보」가 보인다', await 개인정보.떴나(10_000), true);
      await 개인정보.동의누르기();
      const 값남음 = await verify('넣던 사용자명이 남아 있다', (await 양식.떴나(30_000)) ? await 양식.칸글('사용자명') : '', params.사용자명);
      await verify('가입 양식에서 값을 넣다가 뒤로 가면 앞 화면으로 가고 넣던 값이 말없이 사라지지 않는다', 앞화면 && 값남음, true);
    });
  });

  await test.case(내렸다올리기, async ({ params }) => {
    await test.step('값을 넣다가 앱을 5초 내렸다 올린다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: params.사용자명 });
      await 뒤로보냈다오기(driver, 5);
      const 열림 = await verify('가입 양식이 그대로 열려 있다', await 양식.떴나(15_000), true);
      const 값남음 = await verify('넣던 사용자명이 남아 있다', 열림 ? await 양식.칸글('사용자명') : '', params.사용자명);
      await verify('가입 양식에서 앱을 내렸다 올리면 넣던 사용자명이 남아 있다', 열림 && 값남음, true);
    });
  });

  await test.case(회전, async ({ params }) => {
    await test.step('값을 넣다가 화면을 가로 · 세로로 세 번 돌린다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 사용자명: params.사용자명 });
      for (let 번 = 0; 번 < 3; 번++) {
        await 폰상태에서(driver, { 방향: '가로' }, async () => {
          await 양식.떴나(10_000);
        });
        await 양식.떴나(10_000);
      }
      const 값남음 = await verify('넣던 사용자명이 남아 있다', (await 양식.떴나(10_000)) ? await 양식.칸글('사용자명') : '', params.사용자명);
      const 다음 = await verify('「다음」이 다시 보인다', await 양식.다음보이나(), true);
      await verify('가입 양식에서 화면을 세 번 돌리면 넣던 사용자명이 남고 「다음」이 다시 보인다', 값남음 && 다음, true);
    });
  });
});
