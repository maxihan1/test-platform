// 설정·로그인 화면 글자의 영어 (SPEC §8.6·§8.8). 키는 한국어 원문이다

import { 설정API말 } from './settingsApi.js';

export const 설정말: Record<string, string> = {
  ...설정API말,
  // 로그인 화면 (§8.6)
  '아이디와 비밀번호를 넣으면 맡은 애플리케이션이 열립니다.': 'Sign in to open the applications assigned to you.',
  '아이디': 'ID',
  '비밀번호': 'Password',
  '로그인': 'Sign in',
  '확인하는 중': 'Checking',
  '아이디 또는 비밀번호가 맞지 않습니다': 'ID or password is incorrect',

  // 설정 화면의 틀 (§8.8)
  '설정': 'Settings',
  '관리자만 볼 수 있는 화면입니다': 'Admins only',
  '설정은 관리자만 볼 수 있습니다': 'Only admins can open Settings',
  '권한이 필요하면 관리자에게 요청해 주세요': 'Ask an admin user for access if you need it',

  // 구획 머리와 목록 줄
  '애플리케이션': 'Applications',
  '계정': 'Accounts',
  '추가': 'Add',
  '닫기': 'Close',
  '편집': 'Edit',
  '새 계정': 'New account',
  '권한': 'Permissions',
  '저장': 'Save',
  '비활성': 'Inactive',
  '비활성화': 'Deactivate',
  '다시 활성화': 'Reactivate',
  '비활성으로 내리기': 'Deactivate',
  '다시 활성으로': 'Reactivate',
  '아직 애플리케이션이 없습니다': 'No applications yet',
  '케이스 {건수}건': '{건수} cases',
  '배정 없음': 'Unassigned',

  // 서비스 편집기
  '접두사': 'Prefix',
  '만든 뒤에는 바꿀 수 없습니다. 케이스 번호에 이미 쓰고 있습니다':
    'Cannot be changed after creation. It is already baked into the case IDs',
  '대문자로 시작하는 영문·숫자 12자 이내로 적습니다. 예: PAY · MEM2':
    'Up to 12 letters and digits, starting with a capital. e.g. PAY · MEM2',
  '이름': 'Name',
  '결제 페이지': 'Payments',
  '테스트 폴더': 'Tests folder',
  '테스트 저장소': 'Tests repository',
  '작성 요청이 올린 PR 이 이 저장소 것인지 확인하는 데 씁니다. 비워 두면 작성한 케이스를 반영할 수 없습니다':
    'Used to check that the PR from an authoring request belongs to this repository. Leave it empty and the cases it wrote cannot be applied',
  '플랫폼이 테스트 스크립트를 읽어 오는 폴더입니다': 'The folder the platform reads test scripts from',
  '탐색 제외 경로': 'Excluded paths',
  '한 줄에 하나씩 /로 시작하게 적습니다. 실제 화면과 대조해 테스트를 만들 때 이 경로와 하위 화면은 탐색하지 않습니다. 비워 두면 모든 화면을 탐색합니다':
    'One per line, starting with /. When building tests against the live screens, these paths and everything under them are not explored. Leave it empty to explore every screen',
  'Slack 웹훅': 'Slack webhook',
  '피그마 토큰': 'Figma token',
  '이대로 저장하면 토큰이 삭제되어 피그마 자료를 읽을 수 없게 됩니다':
    'Saving now deletes the token, so Figma attachments can no longer be read',
  'Figma의 Settings → Security → Personal access tokens에서 발급합니다. 권한은 File content 읽기 전용으로 하고 만료일을 지정합니다':
    'Create one in Figma → Settings → Security → Personal access tokens. Scope: File content read-only, with an expiry date',
  'Figma 설정 열기': 'Open Figma settings',
  '설정됨': 'Configured',
  '변경': 'Change',
  '변경 취소': 'Cancel change',
  '{이름} 추가': 'Add {이름}',
  '{이름} 변경': 'Change {이름}',
  '{이름} 삭제': 'Delete {이름}',
  '{이름} 변경 취소': 'Cancel changing {이름}',
  '테스트 아이디': 'Test login ID',
  '테스트 비밀번호': 'Test password',
  '대상 서버 {번호} 테스트 아이디': 'Target server {번호} test login ID',
  '대상 서버 {번호} 테스트 비밀번호': 'Target server {번호} test password',
  '비밀번호 없음': 'No password',
  '비밀번호 설정됨': 'Password set',
  '일반 회원': 'Regular user',
  '대상 서버 {번호} 비밀번호 추가': 'Add target server {번호} password',
  '대상 서버 {번호} 비밀번호 변경': 'Change target server {번호} password',
  '대상 서버 {번호} 비밀번호 삭제': 'Delete target server {번호} password',
  '대상 서버 {번호} 비밀번호 변경 취소': 'Cancel changing target server {번호} password',
  '테스트 계정은 실행과 테스트 작성에서 로그인할 때 사용합니다. 실서비스 서버로 체크하면 테스트 작성과 화면 탐색 대상에서 제외됩니다':
    'Test accounts are used to sign in when running and authoring tests. Checking Live service server excludes it from test authoring and screen exploration',
  '실서비스 서버': 'Live service server',
  '대상 서버 {번호} 실서비스 서버': 'Target server {번호} is a live service server',
  '대상 서버 {번호} 앱 파일 경로': 'Target server {번호} app file path',
  '앱 파일 경로 (Android 앱 · 게임)': 'App file path (Android apps · games)',
  '앱 파일 경로는 Android 앱 · 게임 케이스를 돌릴 때 설치할 apk 입니다. Device VISION 이 도는 PC 의 파일 경로나 http(s) 주소를 적고, 비우면 테스트 실행기를 켤 때 준 PLATFORM_APP 을 씁니다':
    'The app file path is the apk installed when Android app cases run. Enter a file path on the PC running Device VISION or an http(s) URL. Leave it empty to use PLATFORM_APP given when the runner started',
  '역할 이름': 'Role name',
  '+ 역할 추가': '+ Add role',
  '대상 서버 {번호} 역할 추가': 'Add a role to target server {번호}',
  '대상 서버 {번호} 역할 {순번} 이름': 'Target server {번호} role {순번} name',
  '대상 서버 {번호} 역할 {순번} 아이디': 'Target server {번호} role {순번} login ID',
  '대상 서버 {번호} 역할 {순번} 비밀번호': 'Target server {번호} role {순번} password',
  '대상 서버 {번호} 역할 {순번} 비밀번호 추가': 'Add target server {번호} role {순번} password',
  '대상 서버 {번호} 역할 {순번} 비밀번호 변경': 'Change target server {번호} role {순번} password',
  '대상 서버 {번호} 역할 {순번} 비밀번호 삭제': 'Delete target server {번호} role {순번} password',
  '대상 서버 {번호} 역할 {순번} 비밀번호 변경 취소': 'Cancel changing target server {번호} role {순번} password',
  '대상 서버 {번호} 역할 {순번} 삭제': 'Delete target server {번호} role {순번}',
  '역할 이름을 바꾸면 이 역할의 비밀번호가 초기화됩니다. 저장한 뒤 다시 입력해 주세요': 'Renaming the role resets its password. Enter it again after saving',
  '키 이름을 바꾸면 이 서버의 비밀번호가 초기화됩니다. 저장한 뒤 다시 입력해 주세요': 'Renaming the key resets this server\'s password. Enter it again after saving',
  '없음': 'None',
  '이대로 저장하면 알림이 꺼집니다. 유지하려면 「변경 취소」를 누릅니다':
    'Saving like this turns notifications off. Press Cancel change to keep them on',
  '저장한 값은 보안상 다시 표시하지 않습니다': 'For security, a saved value is never shown again',

  // 대상 서버 편집기
  '대상 서버§목록': 'Target servers',
  '대상 서버 목록': 'Target server list',
  '대상 서버 {번호} 키': 'Target server {번호} key',
  '대상 서버 {번호} 주소': 'Target server {번호} URL',
  '대상 서버 {번호} 삭제': 'Delete target server {번호}',
  '+ 대상 서버 추가': '+ Add target server',
  '주소': 'URL',
  'PRD 가 기다리는 역할: {역할}': 'Roles the PRD is waiting for: {역할}',
  '빼기': 'Remove',
  '등록된 서버가 없으면 테스트를 실행할 수 없습니다': 'Tests cannot run until a server is registered',

  // 못 보내는 이유 (§8.2 — 버튼은 살려 두고 사유를 말한다)
  '접두사를 입력해 주세요': 'Enter the prefix',
  '이름을 입력해 주세요': 'Enter the name',
  '테스트 폴더를 입력해 주세요': 'Enter the tests folder',
  '대상 서버에 비어 있는 항목이 있습니다. 입력하거나 그 서버를 삭제해 주세요':
    'A target server has an empty field. Fill it in or delete that server',
  '같은 키의 대상 서버가 둘 있습니다. 키를 다르게 적어 주세요': 'Two target servers have the same key. Give each a different key',
  '「{줄}」 — / 로 시작하고 글자·숫자·. _ ~ % - 만 쓸 수 있습니다':
    '"{줄}" must start with / and use only letters, digits and . _ ~ % -',
  '경로는 {글자}자까지 적을 수 있습니다': 'A path can be up to {글자} characters long',
  '경로는 {개수}개까지 적을 수 있습니다': 'You can enter up to {개수} paths',
  '아이디를 채웁니다': 'Fill in the ID',
  '이름을 채웁니다': 'Fill in the name',
  '아이디를 입력해 주세요': 'Enter the ID',
  '역할 이름을 입력해 주세요': 'Enter the role name',
  '「일반 회원」은 역할 이름으로 쓸 수 없습니다': '"Regular user" cannot be used as a role name',
  '역할 이름은 {글자}자까지 적을 수 있습니다': 'A role name can be up to {글자} characters long',
  '한 대상 서버 줄 안에서 역할 이름이 겹칩니다': 'Role names repeat within one target server row',
  '역할 이름은 1~40자이고 「일반 회원」이 아니며 한 대상 서버 줄 안에서 겹치지 않아야 합니다. 한 줄에 20개까지 넣을 수 있습니다':
    'A role name must be 1–40 characters, not "Regular user", and unique within one target server row. Up to 20 per row',
  '역할 계정은 한 줄에 {개수}개까지 넣을 수 있습니다': 'Up to {개수} role accounts per row',

  // 계정 편집기
  '계정 추가': 'Add account',
  '아직 자기 자신에게 배정한 프로젝트가 없습니다. 아래 자기 줄의 「편집」에서 배정합니다':
    'You have no projects assigned to yourself yet. Assign them from Edit on your own row below',
  '김철수': 'Jane Doe',
  '관리자': 'Admin',
  '마지막 관리자라 끌 수 없습니다. 먼저 다른 사람을 관리자로 올립니다':
    'The last admin cannot be turned off. Make someone else an admin first',
  '관리자 (배정된 프로젝트 전부 + 설정 · 반영)': 'Admin (all assigned projects + Settings · apply)',
  '관리자는 배정된 프로젝트에서 모든 기능을 씁니다. 켜 둘 프로젝트만 고르세요.':
    'Admins use every feature in their assigned projects. Pick only the projects to turn on.',
  '프로젝트와 권한': 'Projects and permissions',
  '케이스§권한': 'Cases',
  '실행§권한': 'Runs',
  '작성': 'Authoring',
  '대시보드': 'Dashboard',
  '그래프(Grafana)': 'Graphs (Grafana)',
  '권한 묶음': 'Preset',
  '읽기 전용': 'Read only',
  '작성자': 'Author',
  '실행자§권한': 'Runner',
  '안 씀': 'Off',
  '읽기': 'Read',
  '쓰기': 'Write',
  '이대로면 실행 설정에서 고를 케이스가 보이지 않습니다.': 'No cases will show up to pick in run setup.',
  '세 칸이 모두 「안 씀」이면 저장되지 않습니다. 배정을 풀려면 프로젝트를 끄세요.':
    'All three set to Off cannot be saved. To unassign, turn the project off.',
  '먼저 프로젝트를 만듭니다': 'Create a project first',
  '프로젝트를 고르면 그 안의 애플리케이션이 모두 열리고, 새 애플리케이션이 들어와도 바로 열립니다. 배정받지 않은 프로젝트는 그 사람의 프로젝트 선택 목록에 뜨지 않습니다':
    'Choosing a project opens every application in it, including ones added later. Projects not assigned do not show up in their project picker',
  '애플리케이션 {수}개': '{수} applications',
  '비밀번호는 시스템이 만듭니다. 만든 직후': 'The system generates the password. It is shown',
  '한 번만': 'only once',
  '보여 줍니다': 'right after the account is created',
  '비밀번호 재발급': 'Reissue password',
  '자기 비밀번호는 맨 위 오른쪽 이름을 눌러 나오는 「비밀번호 변경」에서 바꿉니다':
    'Change your own password with "Change password" in the menu under your name at the top right',
  '한 번 더 누르면 지금 비밀번호가 무효가 됩니다': 'Press once more and the current password stops working',

  // 임시 비밀번호 상자 — `<b>` 와 `<code>` 가 사이에 끼어 조각으로 나뉜다
  '의 임시 비밀번호는': "'s temporary password is",
  '입니다': '',
  '지금 적어서 본인에게 전합니다.': 'Write it down now and hand it over.',
  '닫으면 다시 볼 수 없습니다': 'Once closed it cannot be seen again',
  '— 잊으면 다시 만듭니다': '— if it is lost, issue a new one',

  // 작성 에이전트 토큰 — 작성 에이전트 계정에만 보인다
  '작성 에이전트 토큰': 'Authoring agent token',
  '테스트를 대신 쓰는 AI 가 이 토큰으로 로그인합니다': 'The AI that writes tests signs in with this token',
  '작성 에이전트 계정': 'Authoring agent account',
  '토큰 있음': 'Token set',
  '토큰 없음': 'No token',
  '발급': 'Issue',
  '다시 발급': 'Reissue',
  '토큰 취소': 'Revoke token',
  '작성 에이전트가 지금 멈춥니다.': 'The authoring agent stops now.',
  '새 토큰을 다시 넣어야 합니다': 'The new token must be put in again',
  '다시 발급할 때까지 작성이 멈춥니다': 'Authoring stays stopped until a token is issued again',
  '다시 발급한다': 'Reissue now',
  '취소한다': 'Revoke now',
  '그만두기': 'Never mind',
  '의 작성 에이전트 토큰입니다. 선택해 복사하세요': "'s authoring agent token. Select it to copy",
  '서버는 .env 의 AUTHORING_AGENT_TOKEN 에, 맥은 처음 켤 때 묻는 칸에 넣습니다': 'On the server put it in AUTHORING_AGENT_TOKEN in .env; on a Mac paste it at the prompt on first start',
  // 설정 안 메뉴와 서비스 구획 (2026-10-09 UI 개편 묶음 4 시안 A)
  '설정 메뉴': 'Settings menu',
  '+ 애플리케이션 추가': '+ Add application',
  '프로젝트': 'Projects',
  '프로젝트§칸': 'Project',
  '아직 프로젝트가 없습니다': 'No projects yet',
  '+ 프로젝트 추가': '+ Add project',
  '그런 프로젝트가 없습니다': 'No such project',
  '새 프로젝트': 'New project',
  '프로젝트 이름': 'Project name',
  '데모마켓': 'Demo Market',
  '프로젝트 하나에 애플리케이션 여럿이 들어갑니다. 권한은 프로젝트마다 줍니다':
    'A project holds several applications. Permissions are given per project',
  '애플리케이션 옮기기': 'Move applications',
  '옮기면 그 애플리케이션은 옮겨 간 프로젝트의 권한을 따릅니다. 모두 옮기면 빈 프로젝트는 저절로 사라집니다':
    'A moved application follows the permissions of the project it moves to. A project left empty disappears on its own',
  '옮길 프로젝트': 'Move to project',
  '케이스가 뒤에서 부른 서버에 이름을 붙이면 케이스 목록에 이름표가 붙습니다. 같은 이름을 여러 주소에 써도 됩니다':
    'Name the servers your cases call behind the scenes and the case list shows those names as tags. You can use one name for several addresses',
  '케이스를 실행하면 부른 서버가 여기 뜹니다': 'Servers called by your cases show up here after you run them',
  '케이스 {수}개': '{수} cases',
  '이름 없음': 'No name',
  '{호스트} 이름': 'Name for {호스트}',
  '다른 프로젝트로 옮기려면 프로젝트 화면에서 합니다': 'To move it to another project, use the project screen',
  '프로젝트를 골라 주세요': 'Choose a project',
  '사람': 'People',
  '기다리는 가입 신청이 없습니다': 'No sign-up requests waiting',
  '그런 애플리케이션이 없습니다': 'No such application',
  '새 애플리케이션': 'New application',
  '저장했습니다': 'Saved',
  '기본 정보': 'Basics',
  '케이스 번호, 애플리케이션 선택 목록, 스크립트 폴더에 쓰는 정보입니다':
    'Used for case IDs, the application picker and the scripts folder',
  '테스트를 실행할 서버 목록입니다. 하나 이상 등록해야 실행할 수 있습니다':
    'The servers tests run against. Register at least one to run',
  '실행 알림': 'Run notifications',
  '실행할 때 「끝나면 Slack으로 알리기」를 켜면 이 채널로 결과를 보냅니다':
    'Results go to this channel when Notify Slack when done is on for a run',
  '기획서와 피그마로 테스트 스크립트를 만들 때만 사용합니다. 실행에는 영향을 주지 않습니다':
    'Only used when building test scripts from specs and Figma. Runs are not affected',
  '애플리케이션 비활성화': 'Deactivate application',
  '비활성화한다': 'Deactivate now',
  '애플리케이션 선택 목록에서 사라집니다. 실행 기록과 케이스는 그대로 보관됩니다':
    'It disappears from the application picker. Run history and cases are kept',
  '비활성화하면 애플리케이션 선택 목록에서 사라집니다. 실행 기록과 스크립트는 그대로 보관됩니다':
    'Once deactivated, it disappears from the application picker. Run history and scripts are kept',

  // 정기 실행 구획 (§8.8 · 공통/6-인프라 §9.2)
  '정기 실행': 'Scheduled runs',
  '매일 정한 시각에 이 애플리케이션의 스크립트를 자동으로 한 번 실행합니다. 대시보드의 통과율과 일별 결과는 이 실행으로 집계됩니다':
    'Runs this application\'s scripts automatically once a day at the set time. The dashboard pass rate and daily results are based on these runs',
  '매일 돌리기': 'Run daily',
  '시각': 'Time',
  '{시간대} 기준': '{시간대} time',
  '정한 시각부터 1시간 안에 사용 중인 스크립트를 UI·기능 테스트로 한 번씩 실행하고 Slack 웹훅이 있으면 결과를 알립니다. 그 시간에 서버가 꺼져 있으면 그날은 건너뜁니다':
    'Within an hour of the set time, active scripts run once as a UI test and a functional test, and results go to Slack if a webhook is set. If the server is down during that hour, the day is skipped',
  '마지막 정기 실행': 'Last scheduled run',
  '아직 실행한 적이 없습니다': 'Has not run yet',
  '정기 실행 시각을 입력해 주세요': 'Enter the scheduled run time',
  '정기 실행의 대상 서버를 대상 서버 목록에서 고릅니다': 'Pick the scheduled run target server from the target server list',

  // 화면 크기 구획 (§8.8 · PRD-F10-08)
  '화면 크기': 'Screen size',
  '테스트 작성이 화면을 PC 와 모바일로 열어 본 결과입니다. 새 케이스를 PC 로만 만들지 모바일도 같이 만들지 이 판정으로 정합니다':
    'What test authoring saw when it opened each page on desktop and mobile. This decides whether new cases cover desktop only or mobile too',
  '판정 시각': 'Checked at',
  '반응형': 'Responsive',
  '적응형': 'Adaptive',
  'PC 전용': 'Desktop only',
  '아직 판정 안 함': 'Not checked yet',
  '화면별 차이': 'Differences by page',
  '테스트 작성 때 화면을 탐색하면 정해집니다. 대상 서버 주소를 바꾸면 다음 탐색까지 비워 둡니다':
    'Set when test authoring explores the pages. Changing the server address clears it until the next exploration',
  'PC 와 모바일이 다른 화면이 없습니다': 'No page differs between desktop and mobile',
  '{서버} 화면': '{서버} pages',
  '달라진 점': 'What differs',
  '한쪽에만 있는 버튼 · 링크': 'Buttons and links on one side only',
  '모바일은 다른 주소 {주소}': 'Mobile goes to {주소}',
  '옆으로 밀어야 보임': 'Needs sideways scrolling',
  '모바일에서 PC 화면이 작게 보임': 'Shows the desktop page shrunk on mobile',
  '배치가 다름': 'Different layout',
  'PC 에만': 'Only on desktop:',
  '모바일에만': 'Only on mobile:',
  '나머지 {건수}장은 PC 와 모바일이 같습니다': 'The other {건수} pages are the same on desktop and mobile',
  '다른 화면 {전체}장 가운데 앞 {건수}장만 보입니다': 'Showing the first {건수} of {전체} pages that differ',
};
