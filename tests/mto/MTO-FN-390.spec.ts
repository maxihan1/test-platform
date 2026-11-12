import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 웹훅만들기, 웹훅정리 } from './helpers/settings-data.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 웹훅폼화면 } from './pages/webhook-form.page.js';
import { 웹훅화면 } from './pages/webhooks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-390',
  name: '개발 도구 보기 권한이 없는 Admin 이 새 웹훅 화면을 열면 「status.created」 · 「status.updated」 체크박스가 비활성이다',
  precondition: ['Admin 역할 계정으로 로그인해 있다', 'Owner 가 「status.created」 이벤트를 넣은 웹훅을 만들어 두었다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    adminId: z.string().describe('Admin 역할 아이디').optional().meta({ secret: true, account: 'Admin' }),
    adminPassword: z.string().describe('Admin 역할 비밀번호').optional().meta({ secret: true, account: 'Admin' }),
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 폼 = new 웹훅폼화면(page);
  const 목록 = new 웹훅화면(page);
  const 주소 = `https://${고유이름('mto')}.example.com/hook`;
  let Owner창: Page | undefined;

  try {
    await test.step('Owner 창에서 「status.created」 이벤트를 넣은 웹훅을 만든다', async () => {
      Owner창 = await 새창으로로그인(page, params.loginId, params.loginPassword);
      await 웹훅만들기(Owner창, 주소, ['status.created']);
    });
    await test.step('Owner 창의 「웹훅」 화면에서 만든 웹훅을 확인한다', async () => {
      const Owner목록 = new 웹훅화면(Owner창 as Page);
      await Owner목록.열기();
      await verify('Owner 가 「status.created」 이벤트를 넣은 웹훅을 만들어 두었다', await Owner목록.웹훅링크(주소).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('Admin 역할 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.adminId, params.adminPassword);
      await 프로필.열기();
      await verify('Admin 역할 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
    });
    await test.step('「웹훅」 › 「엔드포인트 추가」 화면을 연다', async () => {
      await 폼.열기();
      const 만들어짐 = await verify('「status.created」 체크박스가 비활성이다', await 폼.이벤트('status.created').isDisabled(), true);
      const 수정됨 = await verify('「status.updated」 체크박스가 비활성이다', await 폼.이벤트('status.updated').isDisabled(), true);
      await verify('개발 도구 보기 권한이 없는 Admin 이 새 웹훅 화면을 열면 「status.created」 · 「status.updated」 체크박스가 비활성이다', 만들어짐 && 수정됨, true);
    });
    await test.step('Admin 역할 계정으로 「웹훅」 화면을 연다', async () => {
      await 목록.열기();
      await verify('Admin 의 웹훅 목록에 만들어 둔 웹훅 줄이 보인다', await 목록.웹훅링크(주소).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
      const 수정없음 = await verify('웹훅 줄에 「엔드포인트 수정」이 보이지 않는다', await 목록.수정링크(주소).isVisible(), false);
      const 삭제없음 = await verify('웹훅 줄에 「삭제」가 보이지 않는다', await 목록.삭제링크(주소).isVisible(), false);
      await verify('개발 도구 보기 권한이 없는 Admin 의 웹훅 목록에서 status 이벤트가 든 웹훅 줄에 「엔드포인트 수정」 · 「삭제」가 보이지 않는다', 수정없음 && 삭제없음, true);
    });
  } finally {
    if (Owner창 !== undefined) {
      try {
        await 웹훅정리(Owner창, 주소);
      } finally {
        await Owner창.context().close();
      }
    }
  }
});
