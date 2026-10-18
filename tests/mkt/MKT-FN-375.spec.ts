import { defineCase, test, verify } from '@platform/kit';
import { 로그아웃요청, 로그인요청, 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-375',
  name: '입력 오류는 400 과 code 「VALIDATION」으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

type 실패본문 = { code?: string; message?: string };

test(spec, async ({ page, request }) => {
  const 회원요청 = page.request;
  const 준비: { 쓴이?: 회원정보; 나?: 회원정보; 글번호?: number } = {};
  const 실패본문들: 실패본문[] = [];

  try {
    await test.step('회원으로 로그인한다', async () => {
      준비.나 = await 새회원으로로그인(회원요청);
      준비.쓴이 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('남의 글'), content: '다른 회원이 쓴 글의 내용입니다' });
      await 로그아웃요청(request);
    });

    await test.step('로그인한 상태와 비회원 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(회원요청), true, { blocker: true });
      await verify('비로그인 요청에는 세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
    });

    await test.step('제목 없이 POST /api/posts 를 부른다', async () => {
      const 응답 = await 회원요청.post('/api/posts', { data: { category: '자유', content: '제목이 없는 글의 내용입니다' } });
      const 본문 = (await 응답.json()) as 실패본문;
      실패본문들.push(본문);
      await verify('입력 오류는 400 과 code 「VALIDATION」으로 응답한다', { 상태: 응답.status(), code: 본문.code }, { 상태: 400, code: 'VALIDATION' });
    });

    await test.step('로그인 없이 GET /api/cart 를 부른다', async () => {
      const 응답 = await request.get('/api/cart');
      const 본문 = (await 응답.json()) as 실패본문;
      실패본문들.push(본문);
      await verify('로그인이 필요한 요청을 비로그인으로 부르면 401 과 code 「UNAUTHORIZED」로 응답한다', { 상태: 응답.status(), code: 본문.code }, { 상태: 401, code: 'UNAUTHORIZED' });
    });

    await test.step('다른 회원 글을 PUT /api/posts/{id} 로 고친다', async () => {
      const 응답 = await 회원요청.put(`/api/posts/${준비.글번호}`, { data: { category: '자유', title: '남이 고친 제목', content: '남이 고친 내용이라서 막혀야 합니다' } });
      const 본문 = (await 응답.json()) as 실패본문;
      실패본문들.push(본문);
      await verify('권한 없는 요청은 403 과 code 「FORBIDDEN」으로 응답한다', { 상태: 응답.status(), code: 본문.code }, { 상태: 403, code: 'FORBIDDEN' });
    });

    await test.step('GET /api/posts/999999 를 부른다', async () => {
      const 응답 = await request.get('/api/posts/999999');
      const 본문 = (await 응답.json()) as 실패본문;
      실패본문들.push(본문);
      await verify('없는 대상은 404 와 code 「NOT_FOUND」로 응답한다', { 상태: 응답.status(), code: 본문.code }, { 상태: 404, code: 'NOT_FOUND' });
    });

    await test.step('이미 있는 아이디로 POST /api/auth/signup 을 부른다', async () => {
      const 정보 = 준비.쓴이;
      const 응답 = await request.post('/api/auth/signup', {
        data: { loginId: 정보?.loginId, password: 정보?.password, passwordConfirm: 정보?.password, name: 정보?.name, email: 정보?.email, terms: true, privacy: true },
      });
      const 본문 = (await 응답.json()) as 실패본문;
      실패본문들.push(본문);
      await verify('충돌은 409 와 code 「CONFLICT」로 응답한다', { 상태: 응답.status(), code: 본문.code }, { 상태: 409, code: 'CONFLICT' });
    });

    await test.step('실패 응답의 message 를 확인한다', async () => {
      await verify(
        '실패 응답 본문은 code 와 한국어 message 를 담는다',
        실패본문들.every((본문) => typeof 본문.code === 'string' && /[가-힣]/.test(본문.message ?? '')),
        true,
      );
    });
  } finally {
    if (준비.쓴이 && 준비.글번호 !== undefined) {
      await 로그인요청(request, 준비.쓴이.loginId, 준비.쓴이.password);
      await 글지우기(request, 준비.글번호);
    }
    await 회원과주문정리(request, 준비.쓴이);
    await 회원과주문정리(회원요청, 준비.나);
  }
});
