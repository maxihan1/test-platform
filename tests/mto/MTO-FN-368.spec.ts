import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 그림만들기, 에모지정리, 에모지코드 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지추가화면 } from './pages/custom-emoji-new.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-368',
  name: '「짧은 코드」 1자로 올리면 에모지가 만들어지지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    한자: z.number().int().min(1).max(1).describe('너무 짧은 코드 글자 수 — 1자').default(1),
    두자: z.number().int().min(2).max(128).describe('가장 짧게 허용되는 코드 글자 수 — 2자 이상 128자 이하').default(2),
    백이십팔자: z.number().int().min(2).max(128).describe('가장 길게 허용되는 코드 글자 수 — 2자 이상 128자 이하').default(128),
    백이십구자: z.number().int().min(129).describe('너무 긴 코드 글자 수 — 129자 이상').default(129),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);
  const 추가 = new 커스텀에모지추가화면(page);
  const 코드들 = [에모지코드(params.한자), 에모지코드(params.두자), 에모지코드(params.백이십팔자), 에모지코드(params.백이십구자)];

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「짧은 코드」 1자로 PNG 를 올린다', async () => {
      await 추가.올리기(코드들[0] ?? '', 그림만들기());
      await 추가.오류안내.first().waitFor({ timeout: 10_000 });
      await 목록.열기();
      await verify('「짧은 코드」 1자로 올리면 에모지가 만들어지지 않는다', await 목록.에모지줄(코드들[0] ?? '').count(), 0);
    });

    await test.step('「짧은 코드」 2자로 PNG 를 올린다', async () => {
      await 추가.올리기(코드들[1] ?? '', 그림만들기());
      const 보인다 = await 목록.알림.글('에모지가 성공적으로 생성되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「짧은 코드」 2자 에모지는 「에모지가 성공적으로 생성되었습니다!」와 함께 만들어진다', 보인다, true);
    });

    await test.step('「짧은 코드」 128자로 PNG 를 올린다', async () => {
      await 추가.올리기(코드들[2] ?? '', 그림만들기());
      await 목록.열기();
      await verify('「짧은 코드」 128자 에모지는 만들어진다', await 목록.에모지줄(코드들[2] ?? '').count(), 1);
    });

    await test.step('「짧은 코드」 129자로 PNG 를 올린다', async () => {
      await 추가.올리기(코드들[3] ?? '', 그림만들기());
      await 추가.오류안내.first().waitFor({ timeout: 10_000 });
      await 목록.열기();
      await verify('「짧은 코드」 129자 에모지는 만들어지지 않는다', await 목록.에모지줄(코드들[3] ?? '').count(), 0);
    });
  } finally {
    await 에모지정리(page, ...코드들);
  }
});
