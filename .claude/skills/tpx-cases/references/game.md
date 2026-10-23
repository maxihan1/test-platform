## 게임 케이스 — 꼴 · 상태 도우미 · 확인 수단 · 스모크 · 배치 확인 (2026-10-23 · GAME-F1-11)

종류 「게임」 애플리케이션(프롬프트에 `--- 게임 화면 ---` 절이 있다)의 케이스를 쓸 때 연다. 화면을 읽는 법(첫 화면 · 폰 잡기 · 창 훑기 · 게임 지도)은 `tpx-author` `references/game.md` 다 — 이 파일은 그 뒤 케이스를 쓰는 법이다.
정본은 명세 `docs/spec/도메인/게임.md` §3.10 「케이스 꼴」 · 「확률 세 겹」 · 「설계 칸」 · 「빌드마다 돌리기」 · 「화면 잘림 검사」, 타입은 `docs/spec/공통/3-공유계약.md` 「게임 테스트 타입」이다.
표의 칸 · 줄 쓰는 법(확률 세 겹 · 데이터 표 · 끊김)은 `test-design.md` 「게임 애플리케이션」, 기다림은 `5-stable.md` 「게임」이다.

### 1. 케이스 한 건의 꼴

```ts
import { defineCase, test, verify } from '@platform/kit';

import { 결과고정, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화창 } from './pages/enhance.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-012',
  name: '강화 결과를 파괴로 고정하고 +7 강화를 하면 장검이 가방에서 사라진다',
  platforms: ['android'],
  precondition: ['+6 장검을 가진 새 캐릭터로 마을에 있다', '강화 결과가 파괴로 고정돼 있다'],
  techniques: ['결정 테이블'],
  elements: ['item:sword_long', 'rate:enchant_7'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  const 캐릭터 = await 새캐릭터(admin);
  try {
    await 아이템주기(admin, 캐릭터, 'sword_long', { 강화: 6 });
    await 결과고정(admin, 'enchant', '파괴');
    await test.step('강화사에게 장검 +7 강화를 맡긴다', async () => {
      const 창 = await 강화창.열기(game);
      await 창.강화하기('sword_long');
    });
    await verify('장검이 가방에서 사라진다', await game.find('/HudCanvas/Inventory/Grid/sword_long'), null);
  } finally {
    await 캐릭터지우기(admin, 캐릭터);
  }
});
```

- **몸통은 `{ game, driver, admin, request, api, params, expected }` 다**(정본 명세 공통/2 「게임 케이스」) — `page` 가 없다. `game` 이 게임 안 오브젝트를, `admin` 이 어드민 키를 붙인 서버 요청을, `request` 가 키 없는 서버 요청을, `driver` 가 Appium(앱 끄고 켜기 · 와이파이)을 맡는다
- `platforms: ['android']` 만 적는다. 기능 케이스의 `techniques` 는 웹과 같다(`test-design.md` 「기법 표시」)
- **`elements` 는 그 케이스가 닿는 게임 요소 열쇠다** — `game-elements.json` 에 이번에 쓴 열쇠나 `game-map.txt` 에 있는 열쇠만 적는다. 지어낸 열쇠는 쓰지 않는다. 닿는 요소가 없으면 칸을 빼고, 리터럴 배열로 적는다(`techniques` 와 같다)
- **주소는 오브젝트 이름(하나뿐일 때) 아니면 `/` 로 시작하는 경로다** — 같은 이름 형제는 `[순번]`(0부터). 주소는 CLI 의 `Ran:` 줄 · 창 기록 · 메인이 찍어 둔 트리 파일에서만 옮긴다. 좌표를 받는 메서드는 없다
- **어드민 키를 글자로 쓰지 않는다** — `admin` 이 대상 서버 줄의 키를 머리로 붙이고 기록에서 가린다. 머리 이름(`X-Admin-Key`)도 케이스에 적지 않는다
- **기대값은 표준 기획서에서만 온다.** 화면 · 창 기록 · 게임 지도 · 서비스 가이드는 근거가 아니다(웹과 같다)

### 2. 창 화면 객체 — `pages/<창>.page.ts`

웹 Page Object 와 같은 자리 · 같은 규칙이다(`two-kinds.md` 「Page Object」). 창 하나에 파일 하나고, 생성자가 `GameDriver` 를 받는다.

```ts
import type { GameDriver } from '@platform/kit';

export class 강화창 {
  static readonly 주소 = 'game:World/HudCanvas/EnhancePanel';

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<강화창> {
    await game.click('EnhanceButton');
    await game.waitFor('/HudCanvas/EnhancePanel');
    return new 강화창(game);
  }

  async 강화하기(아이템: string): Promise<void> {
    await this.game.click(`/HudCanvas/EnhancePanel/Slots/${아이템}`);
    await this.game.click('/HudCanvas/EnhancePanel/Confirm');
  }
}
```

- **`주소` 는 그 창의 화면 기록 열쇠 글자 그대로다** — `game:<장면>/<창 경로>`(창 경로는 같은 이름 형제 순번을 뗀 틀), 시작 화면은 `game:<장면>`. 스캔이 이 값으로 케이스와 창 기록을 잇는다. 견주기 명령 · `game-kept/` 기록 머리에 찍힌 열쇠를 옮긴다
- `열기` 는 창이 다 뜬 것(창 루트)을 기다리고 돌아온다. 두 창 이상에 나오는 조각(HUD 바 · 알림 띠)만 `components/` 다

### 3. 상태 도우미 — `helpers/game-state.helper.ts`

케이스 준비는 걸어가거나 사냥해서 만들지 않는다. 새 캐릭터 · 골드 · 아이템 · 위치 · 레벨 · 결과 고정 · 확률 설정 · 몬스터 놓기 · 봇 치우기를 서버에 시켜 바로 만든다(명세 결정 16). 도우미는 서비스마다 한 파일이고 다음 작성이 그대로 다시 쓴다 — 이미 있으면 **더하기만** 한다.

| 서비스 가이드에 | 도우미 | 예 |
|---|---|---|
| 게임 서버 어드민 API | 첫 인자가 `admin: APIRequestContext` | `결과고정(admin, 'enchant', '파괴')` → `POST /admin/forced` |
| GM 명령만 | 첫 인자가 `game: GameDriver` — 채팅 칸에 명령을 넣고 보낸 뒤 결과 글자를 기다린다 | `골드주기(game, 1000)` → `/gold 1000` |
| 둘 다 없다 | 만들지 않는다 | 그 케이스는 보류 — 출처에 `보류 — 상태 만드는 길 없음(어드민 API · GM 명령)` |

- **경로 · 본문 · 명령은 서비스 가이드(`docs/cases/<접두사>.guide.md` · 가이드 첨부)에 적힌 그대로만 쓴다.** 가이드에 없는 경로를 짐작하지 않는다 — 그 준비가 필요한 케이스는 보류다
- **쓴 도우미는 바로 불러 본다** — `npx tsx scripts/authoring-game-state.ts <폴더> <함수> '<인자 JSON 배열>'`. 어드민 API 꼴(첫 인자 `admin`)만 부른다. 케이스와 같은 키 · 같은 서버로 불러 돌려준 값을 찍는다. 던지면 경로 · 본문을 가이드와 다시 맞춘다. 「어드민 키가 없다」로 2 가 나오면 그 준비가 필요한 케이스는 보류다. 불러서 만든 것(캐릭터 · 고정 결과)은 같은 명령으로 지우거나 되돌린다
- 키 값은 환경값(`PLATFORM_ADMIN_KEY`)에만 있다 — 명령 · 케이스 · 파일 · 결과 요약에 글자로 적지 않는다. 빠른 검사가 키 글자를 찾으면 막는다
- 응답 코드가 기대와 다르면 문맥을 붙여 던진다 — `throw new Error(\`결과 고정 실패: ${String(res.status())} ${await res.text()}\`)`. 삼키지 않는다
- **간섭을 막는다** — 캐릭터 이름은 케이스 번호를 붙인 앞머리로 짓고(`qa012-…`), 다른 몬스터 · 봇은 치운 뒤 정해진 자리에 하나만 둔다(Ashveil `/admin/world/reset`). 만든 것은 `finally` 에서 지운다. 고정한 결과 · 바꾼 확률표도 `finally` 에서 되돌린다
- 크롤 전용 캐릭터(`qacrawl`)는 케이스가 쓰지 않는다

### 4. 무엇으로 확인하나

| 값 | 확인 | 꼴 |
|---|---|---|
| 보이는 글자(창 제목 · 안내 · 숫자 표시) | 화면 | `await game.text('/HudCanvas/Gold/Value')` |
| 서버가 정하는 값(재화 · 아이템 · 강화 결과) | **서버와 화면 둘 다** — 값마다 `verify` 따로 | `admin.get(…)` 로 서버 값 · `game.text` 로 화면 값 |
| 게임이 폰에서 셈하는 값(이동 속도 · 데미지) | 게임 안 속성 | `await game.get('Player', 'PlayerController.moveSpeed')` |
| 데이터 표 줄 | 줄마다 `verify.element(문장, 열쇠, 서버값, 기대값)` | 아래 `test-design.md` 「데이터 표」 |
| 확률 ③ 분포 | `verify.rates(문장, 결과마다 횟수, 결과마다 기대 확률, 허용 오차)` | 아래 `test-design.md` 「확률 세 겹」 |

- 어드민 API 가 없고 GM 명령만 있으면 화면 값 · GM 조회 명령으로 보고, 결과 요약에 `서버 값 확인 없음 — <tcId 앞 10개>` 한 줄을 적는다
- 「확인 하나에 값 하나」(`5-writing.md` R12 아래)는 게임도 같다

### 5. 스모크 표시 — `smoke: true`

빌드마다 먼저 도는 케이스다(명세 「빌드마다 돌리기」). **핵심 경로를 한 번씩 지나는 정상 기능 케이스**에만 단다 — 로그인 → 캐릭터 고르기 → 월드 입장 → 사냥 한 번 → 상점 한 번.
경로 한 마디에 케이스 하나, 다 해서 5~10건이다. 경계 · 예외 · 오류 추정 · 확률 ③ 처럼 오래 걸리거나 일부러 틀리게 하는 케이스에는 달지 않는다. 고르기 애매하면 빼 둔다 — 사람이 케이스 목록에서 더한다.

### 6. 화면 잘림 — UI 케이스에 배치 확인 한 줄

창마다 쓰는 UI 케이스에 창을 연 뒤 이 줄을 넣는다. 누를 수 있는 UI 가 화면 안전 영역(노치 · 둥근 모서리 제외) 밖이거나 서로 겹치면 실패한다.

```ts
const 배치 = await game.layout('/HudCanvas/EnhancePanel');
await verify('강화 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
```

이 `verify` 문장은 표의 UI 줄 결과 칸이 아니라 덧붙인 판정이다(`wording.md` 첫 표 「그 밖의 판정 문장」 꼴). 창 하나에 한 번만 넣는다.

### 7. 눌러 보기 · 나눠 쓰기 · 돌려 보기

- **폰을 만지는 것은 메인 하나다** — 눌러 보기 · 창 훑기는 메인만 한다(`tpx-author` `references/game.md` §3). 팬아웃이면 메인이 띄우기 전에 창마다 트리를 찍어 두고, 서브에이전트는 그 파일로만 쓴다(`tpx-author` `references/fanout.md` §7)
- **마지막에 잡은 폰에서 케이스마다 1번 돌린다** — 형식 관문(`check:tests`)을 통과시킨 뒤 `npx control-cli hold --minutes 30` 으로 잡고, 열린 CLI 세션은 `npx control-cli -s=g close` 로 닫고 `npm run -s authoring:run -- 게임 <폴더>` 를 부른다. 3 이면 같은 명령을 다시, 1 이면 빨간 케이스를 고치고 다시 부른다. 끝나면 `npx control-cli release`. 결과 요약 `3번 돌려 보기` 줄에 `폰 1번 — 초록 N · 빨강 M` 을 적는다
- 폰을 못 잡거나 팜이 없거나 앱 줄을 몰라(어드민 키 · 계정이 둘 다 없다) 명령이 2 로 끝나면 `안 돌림(<까닭>)` 을 적는다 — 에이전트가 PR 머리에 「폰에서 돌려 보지 않은 게임 케이스」를 싣는다. 건너뜀을 초록으로 적지 않는다
- **빠른 검사(`authoring:check`)에 「게임 케이스 형식」 줄이 붙는다** (2026-10-23 GAME-F1-12) — 이번에 바뀐 케이스의 `elements` 가 지도(`game-map.txt` + 이번 `game-elements.json` − 그 `remove`)에 있나 · `platforms: ['android']` · 몸통에 `page` 가 없나, 바뀐 파일 전부(화면 객체 · 도우미 포함)에서 `driver` 동작에 `{ x, y }` 좌표를 넘기지 않나를 본다(순간이동 본문 · 위치 기대값은 괜찮다). 그래서 **`game-elements.json` 을 먼저 쓰고 케이스를 쓴다** — 지도에 없다고 찍히면 열쇠를 지어내지 말고 요소를 파일에 더하거나(근거 요구 번호가 있을 때만) 칸에서 뺀다
