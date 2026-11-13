import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 점검돌려놓기, 점검저장하기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검읽기, type 점검 } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-685',
  name: '점검을 저장하면 「기록」에 「점검」 · OFF · 「점검」 · 「<안내 문구> · 허용 계정 없음」 줄이 하나 보인다',
  precondition: ['점검이 꺼져 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 문구 = `[QA] ARO-FN-685 ${String(Date.now())}`;
  let 앞상태 = null as 점검 | null;

  try {
    await test.step('운영자 계정으로 로그인하고 점검 상태를 읽어 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞상태 = await 점검읽기(page);
      await verify('점검이 꺼져 있다', 앞상태.enabled, false, { blocker: true });
    });

    await test.step('API 로 꺼진 점검을 안내 문구와 함께 저장한 뒤 「기록」에서 그 문구로 찾는다', async () => {
      const 응답 = await 점검저장하기(page, { enabled: false, message: 문구, startsAt: null, endsAt: null, allowedAccountIds: '' });
      await verify('점검 저장 요청이 받아들여진다', 응답.status < 300, true, { blocker: true });
      await 화면.열기();
      await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
      await 화면.검색(문구);
      const 칸 = await 화면.칸글(화면.줄들.first());
      const 한줄 = await verify('그 문구로 찾은 줄이 하나다', await 화면.줄들.count(), 1);
      const 앞칸 = await verify('그 줄의 메뉴 · 작업 · 대상이 「점검」 · OFF · 「점검」 꼴이다', [칸[2], 칸[3], 칸[4]].join(' | '), '점검 | OFF | 점검');
      const 내용 = await verify('그 줄의 내용이 「<안내 문구> · 허용 계정 없음」 꼴이다', (칸[5] ?? '').trim(), `${문구} · 허용 계정 없음`);
      await verify('점검을 저장하면 「기록」에 「점검」 · OFF · 「점검」 · 「<안내 문구> · 허용 계정 없음」 줄이 하나 보인다', 한줄 && 앞칸 && 내용, true);
    });
  } finally {
    if (앞상태 !== null) await 점검돌려놓기(page, 앞상태);
  }
});
