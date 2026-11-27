// 설정의 탭 화면 글자의 영어 (SPEC §8.8). 애플리케이션 설정 탭 넷 · 프로젝트 설정 탭 셋 · 대상 서버 편집기의 보이는 이름

export const 설정탭말: Record<string, string> = {
  // 탭 틀
  '애플리케이션 설정': 'Application settings',
  '저장 안 한 변경 있음': 'Unsaved changes',
  '다른 탭의 변경도 같이 저장됩니다 · {탭들}': 'Changes on other tabs are saved too · {탭들}',
  '{탭} 탭에서 확인': 'Check the {탭} tab',
  '알림 · 연동': 'Notifications and links',
  '프로젝트 설정': 'Project settings',

  // 탭 상태 한 줄
  '테스트 저장소 비어 있음': 'Tests repository is empty',
  '✓ 입력 완료': '✓ Complete',
  '대상 서버 없음': 'No target servers',
  '✓ 서버 {서버}개 · 계정 {계정}개': '✓ {서버} servers · {계정} accounts',
  '✓ 피그마 토큰 설정됨': '✓ Figma token set',
  '피그마 토큰 없음': 'No Figma token',
  '✓ Slack 설정됨': '✓ Slack set',
  'Slack 없음': 'No Slack',

  // 「필요한 것」 상자
  '실행하려면 필요한 것': 'Needed to run tests',
  '테스트를 작성하려면 필요한 것': 'Needed to author tests',
  '대상 서버 주소': 'Target server URL',
  '필수': 'Required',
  '로그인이 있는 화면이면 필요': 'Needed if the screens have a login',
  '필수 · 기본 정보 탭': 'Required · Basics tab',
  '실서비스 서버가 아닌 대상 서버': 'A target server that is not a production server',
  '필수 · 실행 탭. 실서비스 서버로 체크한 줄은 작성 · 탐색이 안 갑니다': 'Required · Run tab. Rows marked as production servers are skipped by authoring and exploration',
  '기획서에 피그마 링크가 있을 때만': 'Only when the spec has Figma links',

  // 결함 등록 줄
  '결함 등록': 'Defect reporting',
  '실패한 테스트를 {bts} 이슈로 등록합니다. 연결은 프로젝트마다 하나라서 프로젝트 설정에서 변경합니다': 'Failed tests are filed as {bts} issues. There is one link per project, so change it in the project settings',
  '{프로젝트} 프로젝트 설정에서 보기': 'View in {프로젝트} project settings',

  // 대상 서버 편집기 — 칸 이름 · 머리 · 글자 단추
  '앱 파일 경로': 'App file path',
  '앱 파일 경로 · 패키지 이름': 'App file path · package name',
  '역할 · 아이디 · 비밀번호': 'Role · ID · Password',
  '준비 주소 · 헤더 이름 · 헤더 값 · 제한 시간': 'Setup URL · Header name · Header value · Time limit',
  '헤더 이름 · 헤더 값': 'Header name · Header value',
  '서버 삭제': 'Delete server',
  '계정 삭제': 'Delete account',
  '+ 테스트 데이터 준비': '+ Test data setup',
};
