# 본보기 — Page Object · Component · 도우미를 쓰는 케이스 한 벌

케이스를 쓰기 전에 이 파일 하나를 연다. **이 꼴대로 쓴다.** 다른 서비스 폴더의 케이스를 본보기로 삼지 않는다 —
`tests/` 아래 케이스는 작성 요청이 고치거나 지울 수 있고, 규칙을 어긴 것도 섞여 있다(2026-11-02 — 옛 본보기 `tests/demo/DEMO-011.spec.ts` 는 작성 요청이 지웠고, 그 파일도 케이스에서 locator 를 바로 썼다).

이 파일은 작성 에이전트가 고칠 수 없는 자리(`.claude/`)에 있다. 지우거나 옮기면 하네스 검사(`.claude/scripts/example.test.mjs`)가 빨개진다.
`tests/dmw` 의 Page Object · Component · 도우미를 바탕으로 꼴이 잘 보이게 다듬었다. 돌리지 않는 꼴 본보기라 실제 파일과 다를 수 있다 — 이름이 아니라 꼴을 따른다.

## 1. 케이스 — `tests/<폴더>/<접두사>-FN-NNN.spec.ts`

```ts
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-999',
  name: '관리자가 아이디로 회원을 찾으면 그 회원 줄 하나만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다', '찾을 아이디의 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    찾을아이디: z.string().min(1).describe('찾을 회원 아이디').default('user001'),
  }),
  expected: z.object({
    보이는줄수: z.number().describe('검색 뒤 보이는 회원 줄 수').default(1),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 관리자화면(page);

  await test.step('관리자 계정으로 로그인하고 관리자 화면을 연다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
    await 화면.열기();
    await verify('회원 관리 표가 보인다', await 화면.회원표.isVisible(), true, { blocker: true });
  });

  await test.step('아이디 검색 칸에 찾을 아이디를 넣는다', async () => {
    await 화면.아이디검색(params.찾을아이디);
    await verify('검색 뒤 보이는 회원 줄 수가 기대와 같다', await 화면.아이디들.count(), expected.보이는줄수);
  });
});
```

## 2. Page Object — `tests/<폴더>/pages/<화면>.page.ts`

화면 하나에 파일 하나다. locator 와 짧은 동작(열기 · 채우기 · 누르기 · 기다리기)만 담는다. 판정(`verify` · `expect`) · `test.step` · 주석은 담지 않는다.

```ts
import type { Locator, Page } from '@playwright/test';

import { 토스트 } from '../components/toast.component.js';

export class 관리자화면 {
  static readonly 주소 = '/admin';

  readonly 알림: 토스트;
  readonly 검색칸: Locator;
  readonly 총인원: Locator;
  readonly 회원목록영역: Locator;
  readonly 회원표: Locator;
  readonly 아이디들: Locator;

  constructor(private readonly page: Page) {
    this.알림 = new 토스트(page);
    this.검색칸 = page.getByRole('searchbox', { name: '아이디 검색' });
    this.총인원 = page.getByText(/^총 \d+명$/);
    this.회원목록영역 = page.getByLabel('회원 목록', { exact: true });
    this.회원표 = this.회원목록영역.getByRole('table');
    this.아이디들 = this.회원목록영역.locator('tr.u td:first-child');
  }

  async 열기(): Promise<void> {
    await this.page.goto(관리자화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.회원표.waitFor();
    await this.총인원.waitFor();
  }

  회원줄(아이디: string): Locator {
    return this.회원목록영역.getByRole('row').filter({ has: this.page.getByRole('cell', { name: 아이디, exact: true }) });
  }

  async 아이디검색(아이디: string): Promise<void> {
    await this.검색칸.fill(아이디);
    await this.아이디들.filter({ hasNotText: 아이디 }).first().waitFor({ state: 'detached' });
    await this.회원줄(아이디).first().waitFor();
  }
}
```

## 3. Component — `tests/<폴더>/components/<조각>.component.ts`

**두 화면 이상에 나오는 화면 조각**(머리 메뉴 · 토스트 · 모달)만 Component 로 뺀다. 화면 파일이 생성자에서 만들어 들고 있고(위 `this.알림 = new 토스트(page)`), 케이스는 `화면.알림.글('저장했습니다')` 처럼 닿는다.

```ts
import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 모두: Locator;

  constructor(page: Page) {
    this.상자 = page.locator('#toast-box');
    this.모두 = this.상자.locator('.toast');
  }

  글(문구: string): Locator {
    return this.모두.filter({ hasText: 문구 });
  }
}
```

## 4. 도우미 — `tests/<폴더>/helpers/<이름>.helper.ts`

화면이 아닌 반복 작업(로그인 · 가입 · 탈퇴 · 자료 만들고 지우기)이다. **`components/` 에 두지 않는다** — 스캔이 `pages/` · `components/` 로 「케이스 ↔ 화면」 지도를 채워서, 도우미가 거기 있으면 모든 케이스가 그 조각을 거치는 것처럼 잡힌다.
위 케이스의 `계정으로로그인(page, 아이디, 비밀번호)` · `안내창막기(page)` 가 이것이다.

## 5. API 케이스 — 화면 없는 요구

API 케이스는 Functional Test 이고 **Page Object 를 쓰지 않는다**(`5-writing.md` 「화면 없는 요구 — API 케이스」 · `api.md`). 주소는 `/api/…` 상대 경로다.
로그인 없는 요청은 `request` fixture, 화면으로 로그인한 쿠키가 필요하면 `page.request` 를 쓴다.

```ts
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DMW-FN-998',
  name: '공지 목록 API 를 부르면 비어 있지 않은 목록이 돌아온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: z.object({
    쪽: z.number().int().min(1).describe('불러올 쪽').default(1),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    비어있지않음: z.boolean().describe('목록이 비어 있지 않은지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 줄들: unknown[] = [];

  await test.step('공지 목록 API 를 부른다', async () => {
    const 응답 = await request.get(`/api/notices?page=${params.쪽}`);
    await verify('응답 코드가 기대와 같다', 응답.status(), expected.응답코드, { blocker: true });
    줄들 = ((await 응답.json()) as { items: unknown[] }).items;
  });

  await test.step('돌아온 목록을 확인한다', async () => {
    await verify('목록이 배열로 돌아온다', Array.isArray(줄들), true);
    await verify('목록이 비어 있지 않다', 줄들.length > 0, expected.비어있지않음);
  });
});
```

## 6. 볼 점

1. **케이스 파일에 `page.getBy…` · `page.locator` 가 없다.** 화면은 Page Object 로만 다룬다(UI Test · Functional Test 둘 다 — `two-kinds.md` 「Page Object」). API 케이스만 예외다(`api.md`)
2. 주소는 Page Object 의 `static readonly 주소` 에 상대 경로로 둔다. 앞부분은 러너가 실행마다 `PLATFORM_BASE_URL` 로 채운다
3. 계정은 비밀값 칸(`.meta({ secret: true, account: '<역할>' })`)으로만 받는다. 값은 kit 이 채운다
4. 사람이 바꿔 볼 입력(검색어)은 입력값 칸으로 연다(`5-inputs.md`). 기대값은 `expected` 에 기본값으로 둔다
5. 준비 단계에는 그 화면이 맞는지 보는 판정을 `{ blocker: true }` 로 하나 둔다
6. 기다리기는 Page Object 가 맡는다(`그려질때까지` · `아이디검색` 안의 `waitFor`). `waitForTimeout` · `networkidle` 은 쓰지 않는다(`5-stable.md`)
7. 거르기 · 검색 뒤에는 **바뀐 결과**를 기다린다. 찾는 줄은 검색 전 목록에도 있을 수 있어서, 그 줄이 보이는 것만 기다리면 걸러지기 전에 지나간다. 그래서 `아이디검색` 은 다른 줄이 사라질 때까지 기다린 뒤 돌아온다 — `count()` 는 스스로 기다리지 않는다
8. 정상 · UI 줄의 케이스에는 `techniques` 를 달지 않는다. 경계 · 예외 · 오류 추정 줄만 단다(`test-design.md` 「기법 표시」)
