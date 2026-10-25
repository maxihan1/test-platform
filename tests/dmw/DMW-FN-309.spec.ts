import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-309',
  name: '10MB 파일을 첨부하면 첨부 파일 이름이 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    첨부한도안바이트: z.number().int().min(1).describe('첨부 파일 크기(바이트) — 1 이상 10485760 이하').default(10485760),
    첨부한도밖바이트: z.number().int().min(10485761).describe('한도를 넘기는 첨부 파일 크기(바이트) — 10485761 이상').default(10485761),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 문의화면(page);
  const 알림 = new 토스트(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await verify('1:1 문의 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('10MB 파일을 첨부한다', async () => {
    await 화면.첨부하기('열메가.bin', params.첨부한도안바이트);
    await verify('10MB 파일을 첨부하면 첨부 파일 이름이 보인다', await 화면.첨부파일이름(), '열메가.bin');
  });

  await test.step('10MB 를 넘는 파일을 첨부한다', async () => {
    await 화면.첨부하기('열메가초과.bin', params.첨부한도밖바이트);
    await 알림.글('10MB 이하 파일만 올릴 수 있습니다').first().waitFor();
    await verify('10MB 를 넘는 파일은 첨부되지 않는다', await 화면.첨부파일수(), 0);
  });
});
