> **웹 케이스 — 로그인은 이어 쓴다** (2026-11-15 사용자 · 정본 SPEC 도메인/러너 §5.2 「웹 공용 부품」).
> 로그인 도우미(`helpers/login.helper.ts`)는 화면으로 로그인하는 일을 kit `로그인이어쓰기` 에 넘긴다 — 계정마다 처음 한 번만 화면으로 로그인하고 그 뒤 케이스는 남긴 로그인 상태로 시작한다.
> 케이스마다 화면으로 로그인하면 느리고 대상 서버의 로그인 한도에 걸린다(Mastodon 계정당 1시간 25회 — 작성이 5시간 멈췄다).
>
> ```ts
> import { 로그인이어쓰기 } from '@platform/kit/parts';
>
> export async function 로그인하기(page: Page, 아이디: string, 암호: string): Promise<void> {
>   await 로그인이어쓰기(page, 아이디, 암호, {
>     로그인: async () => {
>       await page.context().clearCookies();
>       await page.goto('/auth/sign_in');
>       await page.getByRole('textbox', { name: '이메일 주소' }).fill(아이디);
>       await page.getByRole('textbox', { name: '암호' }).fill(암호);
>       await page.getByRole('button', { name: '로그인' }).click();
>       await page.waitForURL((u) => !u.pathname.startsWith('/auth/sign_in'));
>     },
>     들어왔나: async () => {
>       await page.goto('/home');
>       return page.getByRole('navigation', { name: '메인' }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
>     },
>   });
> }
> ```
>
> - `들어왔나` 는 로그인한 사람에게만 보이는 화면을 열어 본다 — 남긴 상태가 끊겼으면 거짓을 돌려주고 부품이 다시 로그인한다
> - **`로그인` 은 어떤 화면 · 어떤 계정에서 불려도 되게 쓴다** — E2E 는 창을 이어 써서 앞 단계가 다른 계정으로 들어와 있을 수 있다. 본보기처럼 먼저 로그아웃(쿠키 비우기)한 뒤 로그인 화면을 연다(위 표 「다른 계정이거나 모른다」)
> - **이어 쓰는 것은 대상 서버의 쿠키뿐이다** — 로그인 값을 localStorage 에 두는 앱만 `저장키: ['<키 이름>']` 로 그 키를 고른다. 「안내 봤음」 같은 값은 고르지 않는다(다음 케이스에서 안내가 안 뜬다)
> - **같은 계정의 케이스가 서버 세션 하나를 나눠 쓴다.** 그래서 **세션을 끊는 케이스(로그아웃 · 비밀번호 변경 · 탈퇴 · 「모든 기기에서 로그아웃」)와 로그인 화면 자체를 시험하는 케이스는 이 도우미를 안 쓴다** — 화면 객체로 직접 로그인해 제 세션을 따로 갖는다. 나란히 도는 다른 케이스(PC · 휴대폰 · 다른 항목)가 중간에 튕긴다. 비밀번호 변경처럼 그 계정의 세션을 다 끊는 케이스는 그 일만 맡는 계정을 쓴다(없으면 결과 요약에 적는다)
> - 로그인 뒤 도우미가 첫 화면까지 여는 일은 그대로다 — 부품은 로그인 상태만 맞춘다
> - 웹 API 로그인(`page.request.post('/api/auth/login', …)`)을 쓰는 서비스는 이미 빨라 바꾸지 않는다
