import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { IP규칙폼화면 } from './pages/ip-block-new.page.js';
import { IP규칙목록화면 } from './pages/ip-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-202',
  name: '새 IP 규칙 폼에 「IP」 · 「만기」(기본 「1 년」) · 「규칙」(기본 「접근 차단」) · 「주석」 · 「규칙 만들기」와 「자기 자신을 잠가버리지 않도록 주의하세요!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new IP규칙목록화면(page);
  const 폼 = new IP규칙폼화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「IP 규칙들」 화면에서 「규칙 만들기」를 누른다', async () => {
    await 목록.규칙만들기.click();
    await 폼.제목.waitFor();
    const 아이피 = await verify('「IP」 칸이 보인다', await 폼.아이피칸.isVisible(), true);
    const 만기 = await verify('「만기」가 보인다', await 폼.만기.isVisible(), true);
    const 만기기본 = await verify('만기 기본값이 「1 년」이다', await 폼.만기기본값(), '1 년');
    const 접근 = await verify('규칙 기본값이 「접근 차단」이다', await 폼.접근차단.isChecked(), true);
    const 주석 = await verify('「주석」이 보인다', await 폼.주석.isVisible(), true);
    const 만들기 = await verify('「규칙 만들기」가 보인다', await 폼.규칙만들기.isVisible(), true);
    const 주의 = await verify('「자기 자신을 잠가버리지 않도록 주의하세요!」가 보인다', await 폼.잠금주의.isVisible(), true);
    await verify('새 IP 규칙 폼에 「IP」 · 「만기」(기본 「1 년」) · 「규칙」(기본 「접근 차단」) · 「주석」 · 「규칙 만들기」와 「자기 자신을 잠가버리지 않도록 주의하세요!」가 보인다', 아이피 && 만기 && 만기기본 && 접근 && 주석 && 만들기 && 주의, true);
  });
});
