// 킷·리포터·러너가 결과를 주고받는 약속. 세 곳이 같은 문자열을 봐야 해서 한 자리에 모은다 (SPEC §5.2)

// 절차 결과 한 건을 리포터에 넘길 때 쓰는 첨부 이름
export const STEP_ATTACHMENT = 'platform-step';

// 앱 항목의 기기 정보(DeviceInfo)를 리포터에 넘길 때 쓰는 첨부 이름
export const DEVICE_ATTACHMENT = 'platform-device';

// 러너가 stdout에서 결과 줄을 찾을 때 쓰는 표시자
export const RESULT_MARKER = '@@RESULT@@';

// 러너가 stdout에서 절차 시작 줄을 찾을 때 쓰는 표시자
export const PROGRESS_MARKER = '@@PROGRESS@@';

// 러너가 stdout에서 E2E 시나리오 부품 결과 줄을 찾을 때 쓰는 표시자. 케이스의 결과 줄과 섞이지 않게 따로 둔다
export const SCENARIO_PART_MARKER = '@@SCENARIO_PART@@';

// 시나리오 끝에 보낸 미룬 삭제 결과 한 줄. 부품 줄과 섞이지 않게 따로 둔다
export const SCENARIO_CLEANUP_MARKER = '@@SCENARIO_CLEANUP@@';

// 앱 · 게임 단계가 연 폰의 판(DeviceInfo) 한 줄. 연결이 시나리오에 하나라 한 번만 흘린다 (도메인/시나리오 §3.7 결정 16)
export const SCENARIO_DEVICE_MARKER = '@@SCENARIO_DEVICE@@';

// 킷이 Appium 연결 번호를 적는 파일 이름. 실행 폴더 안에 둔다. 러너가 끊을 때 이 파일로 남은 연결을 닫는다 (러너 §5.2)
export const APPIUM_SESSION_FILE = 'appium-session';

// 위 파일은 닫으면 지운다. 팜 증적(영상 · logcat)은 닫은 뒤에야 받을 수 있어 번호를 따로 한 벌 남긴다. 러너가 받은 뒤 지운다 (러너 §5.2 「디바이스 팜 접속 방식」)
export const APPIUM_SESSION_ID_FILE = 'appium-session-id';

// 러너가 받은 팜 증적을 두는 실행 폴더 안 하위 폴더. admin 이 같은 이름으로 찾는다
export const FARM_EVIDENCE_DIR = 'farm';

// 통과 못 한 게임 항목에 kit 이 위 폴더로 남기는 두 파일 — 실패 순간 켜진 오브젝트 목록 · 케이스 동안 난 게임 오류 (도메인/게임 §3.10 「실행 결과」).
// 정기 실행은 통과 항목도 오류 파일을 남기고 admin 안정화 집계가 읽는다 (도메인/안정화 §3.15 결정 3)
export const GAME_TREE_FILE = 'game-tree.txt';
export const GAME_ERRORS_FILE = 'game-errors.txt';

// 게임 항목의 데이터 대조 줄 · 부른 서버 API 를 리포터에 넘길 때 쓰는 첨부 이름 (공통/3-공유계약 「게임 테스트 타입」)
export const GAME_ATTACHMENT = 'platform-game';

// 앱 파일 칸(대상 서버 줄 · 러너 요청의 app)이 받는 값 — 파일 경로나 http(s) 주소다. 받는 쪽은 Appium 이 도는 PC(팜 PC)이고,
// file:// 같은 다른 꼴은 그 PC 의 아무 파일이나 깔게 된다. admin 설정과 러너가 같은 규칙을 봐야 해서 여기 둔다 (러너 §5.2 「대상 서버마다 다른 앱 파일」)
export function 앱파일값인가(값: string): boolean {
  return !값.includes('://') || /^https?:\/\/[^/]/i.test(값);
}

// 같은 칸에 적은 스토어 앱의 패키지 이름(com.shop.app)인가 — APK 가 없어 깔지 않고 폰에 깔린 앱을 켠다.
// kit 은 appium:appPackage 로 열고 admin 은 그 앱이 깔린 폰만 잡아서 둘이 같은 규칙을 봐야 한다. 끝 마디가 앱 파일 확장자면 파일이다 (러너 §5.2 「플레이스토어 앱 — 패키지 이름」)
export function 패키지이름인가(값: string): boolean {
  return /^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/.test(값) && !/\.(apk|apks|aab|xapk|zip)$/i.test(값);
}

// E2E API 호출 단계 값 주입 이름 — 러너 입구 · 서버 조립 검사 · 조립 화면이 같은 규칙을 봐야 저장만 되고 못 도는 시나리오가 안 생긴다 (SPEC 도메인/시나리오 §3.7 결정 14)
export const 값주입이름 = /^[A-Za-z0-9_가-힣]{1,20}$/;

// 폰 Chrome 은 창(브라우저 컨텍스트)을 새로 못 만든다. 폰이 내는 오류는 Chrome 판마다 달라 미리 같은 글로 막는다 (SPEC 도메인/실행 §3.2 「실제 폰에서 안 되는 것」).
// 러너 고정 spec(apps/runner/scenario/realPhone.ts)이 옮겨 적는다
export const 창하나글 = '실제 폰 Chrome 은 창을 하나만 쓴다 — 케이스가 창을 새로 만들었다(browser.newContext)';
