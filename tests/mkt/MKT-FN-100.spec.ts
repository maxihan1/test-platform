import { defineCase, test, verify } from '@platform/kit';

type 문의본문 = { id: number; title: string };

export const spec = defineCase({
  tcId: 'MKT-FN-100',
  name: '주소 검색 · FAQ · 문의 · 알림 API 가 한 글자 검색은 400 으로 막고 나머지는 목록으로 응답한다',
  precondition: ['비회원이다', '새로 가입한 회원이 로그인해 있다', '회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('주소 검색 API 를 한 글자로 부른다', async () => {
      await verify('새로 가입한 회원이 로그인해 있다', 로그인응답.status(), 200, { blocker: true });
      const 응답 = await request.get(`/api/address?q=${encodeURIComponent('서')}`);
      await verify('주소 검색어가 2자 미만이면 400 으로 응답한다', 응답.status(), 400);
    });

    await test.step('FAQ API 를 부른다', async () => {
      const 응답 = await request.get('/api/faq');
      const 질문들 = ((await 응답.json()) as { items: unknown[] }).items;
      await verify('FAQ API 는 질문 목록을 돌려준다', [응답.status(), Array.isArray(질문들), 질문들.length > 0], [200, true, true]);
    });

    await test.step('문의 등록 API 와 내 문의 목록 API 를 부른다', async () => {
      const 등록 = await page.request.post('/api/inquiries', {
        data: { type: '기타', title: 'API 케이스 임시 문의', content: 'API 케이스가 만든 임시 문의입니다.', fileName: '', fileData: '', emailNotify: false },
      });
      const 문의번호 = 등록.ok() ? ((await 등록.json()) as 문의본문).id : 0;
      const 목록 = ((await (await page.request.get('/api/inquiries')).json()) as { items: 문의본문[] }).items;
      await verify('문의 등록 API 로 만든 문의가 내 문의 목록에 들어간다', [등록.status(), 목록.some((문의) => 문의.id === 문의번호)], [201, true]);
    });

    await test.step('알림 목록 API 와 모두 읽음 API 를 부른다', async () => {
      const 목록 = await page.request.get('/api/notifications');
      const 본문 = (await 목록.json()) as { items: unknown; unread: unknown };
      const 모두읽음 = await page.request.post('/api/notifications/read');
      await verify(
        '알림 목록 API 는 읽지 않은 수를 담아 돌려주고 모두 읽음 API 가 성공한다',
        [목록.status(), Array.isArray(본문.items), typeof 본문.unread, 모두읽음.ok()],
        [200, true, 'number', true],
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
