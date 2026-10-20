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

// 킷이 Appium 연결 번호를 적는 파일 이름. 실행 폴더 안에 둔다. 러너가 끊을 때 이 파일로 남은 연결을 닫는다 (러너 §5.2)
export const APPIUM_SESSION_FILE = 'appium-session';

// 앱 파일 칸(대상 서버 줄 · 러너 요청의 app)이 받는 값 — 파일 경로나 http(s) 주소다. 받는 쪽은 Appium 이 도는 PC(팜 PC)이고,
// file:// 같은 다른 꼴은 그 PC 의 아무 파일이나 깔게 된다. admin 설정과 러너가 같은 규칙을 봐야 해서 여기 둔다 (러너 §5.2 「대상 서버마다 다른 앱 파일」)
export function 앱파일값인가(값: string): boolean {
  return !값.includes('://') || /^https?:\/\/[^/]/i.test(값);
}
