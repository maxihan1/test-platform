import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쉰한번째기록줄글, 작업기록채우기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-017',
  name: '운영자 작업 기록이 51건 이상일 때 「기록」을 열면 첫 쪽에 50건이 보인다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 작업 기록이 51건 이상이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    쪽크기: z.number().describe('한 쪽에 보이는 기록 수').default(50),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인해 운영자 작업 기록을 51건 이상으로 채운다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 작업기록채우기(page, params.loginId ?? '', params.loginPassword ?? '', 51);
  });

  await test.step('「기록」의 운영자 작업 첫 쪽을 본다', async () => {
    await 화면.열기();
    const 건수 = Number((await 화면.총건수.innerText()).replace(/[^\d]/g, ''));
    await verify('운영자 작업 기록이 51건 이상이다', 건수 >= 51, true, { blocker: true });
    await verify('운영자 작업 기록이 51건 이상일 때 「기록」을 열면 첫 쪽에 50건이 보인다', await 화면.줄들.count(), expected.쪽크기);
  });

  await test.step('「다음」을 누른다', async () => {
    const 앞에서읽음 = await 쉰한번째기록줄글(page);
    await 화면.다음쪽으로();
    const 화면에서읽음 = (await 화면.칸글(화면.줄들.first())).map((글) => 글.trim()).join(' | ');
    const 뒤에서읽음 = await 쉰한번째기록줄글(page);
    await verify('둘째 쪽 첫 줄은 51번째 기록이다', 화면에서읽음 === 앞에서읽음 || 화면에서읽음 === 뒤에서읽음, true);
  });
});
