import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-323',
  name: '로그인 없이 GET /api/faq 를 부르면 FAQ 가 돌아온다',
  precondition: ['로그인하지 않은 요청이다', '새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보!: 회원정보;

  try {
    await test.step('로그인하지 않은 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
    });

    await test.step('GET /api/faq 를 부른다', async () => {
      const 응답 = await request.get('/api/faq');
      const 본문 = (await 응답.json()) as { items?: unknown[] };
      await verify('로그인 없이 GET /api/faq 를 부르면 FAQ 가 돌아온다', 응답.status() === 200 && Array.isArray(본문.items) && 본문.items.length > 0, true);
    });

    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('POST /api/inquiries 로 문의를 등록하고 GET /api/inquiries 를 부른다', async () => {
      const 등록 = await request.post('/api/inquiries', { data: { type: '기타', title: '임시 문의 제목', content: '임시 문의 내용입니다', fileName: '', fileData: '', emailNotify: false } });
      const 등록본문 = (await 등록.json()) as { id?: number };
      const 목록 = (await (await request.get('/api/inquiries')).json()) as { items: { id: number }[] };
      await verify('문의를 등록하면 GET /api/inquiries 맨 앞에 그 문의가 돌아온다', 등록본문.id !== undefined && 목록.items[0]?.id === 등록본문.id, true);
    });
  } finally {
    await 탈퇴(request);
  }
});
