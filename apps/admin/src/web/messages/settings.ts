// 설정·로그인 화면 글자의 영어 (SPEC §8.6·§8.8). 키는 한국어 원문이다

export const 설정말: Record<string, string> = {
  // 로그인 화면 (§8.6)
  '테스트 플랫폼': 'Test Platform',
  '다시 오셨군요': 'Welcome back',
  '아이디와 비밀번호를 넣으면 맡은 서비스가 열립니다.': 'Sign in to open the services assigned to you.',
  '아이디': 'ID',
  '비밀번호': 'Password',
  '로그인': 'Sign in',
  '확인하는 중': 'Checking',
  '아이디 또는 비밀번호가 맞지 않습니다': 'ID or password is incorrect',

  // 설정 화면의 틀 (§8.8)
  '설정': 'Settings',
  '운영 등급만 볼 수 있는 자리다': 'Admins only',
  '설정은 운영 등급만 볼 수 있습니다': 'Only admins can open Settings',
  '필요하면 운영 등급인 사람에게 올려 달라고 합니다': 'Ask an admin to raise your role if you need it',

  // 구획 머리와 목록 줄
  '서비스': 'Services',
  '계정': 'Accounts',
  '더하기': 'Add',
  '닫기': 'Close',
  '편집': 'Edit',
  '저장': 'Save',
  '비활성': 'Inactive',
  '비활성으로 내리기': 'Deactivate',
  '다시 활성으로': 'Reactivate',
  '아직 서비스가 없습니다': 'No services yet',
  '위 「+」로 첫 서비스를 만듭니다': 'Use + above to create the first one',
  '케이스 {건수}건': '{건수} cases',
  '대상 서버 없음': 'No target servers',
  '대상 서버 {개수}개': '{개수} target servers',
  '배정 없음': 'Unassigned',

  // 서비스 편집기
  '서비스 추가': 'Add service',
  '접두사': 'Prefix',
  '만들 때만 정합니다. 케이스 번호(PAY-001) 안에 박히므로 나중에 바꿀 수 없습니다':
    'Set once at creation. It is baked into case IDs like PAY-001, so it cannot change later',
  '만든 뒤에는 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다':
    'Cannot be changed after creation. It is already baked into the case IDs',
  '대문자로 시작하는 영문·숫자 12자 이내로 적습니다. 예: PAY · MEM2':
    'Up to 12 letters and digits, starting with a capital. e.g. PAY · MEM2',
  '이름': 'Name',
  '결제 서비스': 'Payments',
  '테스트 폴더': 'Tests folder',
  '플랫폼이 실제로 훑을 폴더입니다': 'The folder the platform actually scans',
  '테스트 저장소': 'Tests repository',
  '적어 두기만 합니다. 플랫폼이 받아오지는 않습니다': 'Recorded for reference only. The platform does not fetch it',
  'Slack 웹훅': 'Slack webhook',
  '피그마 토큰': 'Figma token',
  '이대로 저장하면 토큰을 지웁니다. 피그마 자료를 못 읽게 됩니다':
    'Saving now removes the token. Figma attachments can no longer be read',
  'Figma → Settings → Security → Personal access tokens 에서 만듭니다. 권한은 File content 읽기만, 만료일을 정합니다':
    'Create one in Figma → Settings → Security → Personal access tokens. Scope: File content read-only, with an expiry date',
  'Figma 설정 열기': 'Open Figma settings',
  '설정됨': 'Configured',
  '다시 넣기': 'Replace',
  '테스트 아이디': 'Test login ID',
  '테스트 비밀번호': 'Test password',
  '대상 서버 {번호} 테스트 아이디': 'Target server {번호} test login ID',
  '대상 서버 {번호} 테스트 비밀번호': 'Target server {번호} test password',
  '비밀번호 없음': 'No password',
  '테스트 계정은 역방향 작성에서만 씁니다. 운영 서버 줄에는 넣지 않습니다': 'Test accounts are used only for reverse authoring. Do not add one to a production server row',
  '키 이름을 바꾸면 이 줄의 비밀번호가 비워집니다. 저장한 뒤 다시 넣어 주세요': 'Renaming the key clears this row\'s password. Enter it again after saving',
  '없음': 'None',
  '넣기': 'Add',
  '그대로 두기': 'Keep current',
  '이대로 저장하면 알림을 끕니다. 그대로 두려면 「그대로 두기」를 누릅니다':
    'Saving like this turns notifications off. Press Keep current to leave it as is',
  '비밀값이라 한 번 넣으면 되돌려 보여주지 않습니다': 'It is a secret, so it is never shown back once saved',

  // 대상 서버 편집기
  '대상 서버': 'Target servers',
  '대상 서버 목록': 'Target server list',
  '대상 서버 {번호} 키': 'Target server {번호} key',
  '대상 서버 {번호} 주소': 'Target server {번호} URL',
  '대상 서버 {번호} 빼기': 'Remove target server {번호}',
  '빼기': 'Remove',
  '줄 더하기': 'Add row',
  '하나도 없으면 실행 설정에서 고를 것이 없어 실행을 못 합니다':
    'With none set there is nothing to pick when running, so runs cannot start',

  // 못 보내는 이유 (§8.2 — 버튼은 살려 두고 사유를 말한다)
  '접두사를 채웁니다': 'Fill in the prefix',
  '이름을 채웁니다': 'Fill in the name',
  '테스트 폴더를 채웁니다': 'Fill in the tests folder',
  '대상 서버 줄에 빈 칸이 있습니다. 채우거나 그 줄을 뺍니다':
    'A target server row has an empty field. Fill it in or remove the row',
  '아이디를 채웁니다': 'Fill in the ID',

  // 계정 편집기
  '계정 추가': 'Add account',
  '아직 자기 자신에게 배정한 서비스가 없습니다. 아래 자기 줄의 「편집」에서 배정합니다':
    'You have no services assigned to yourself yet. Assign them from Edit on your own row below',
  '김철수': 'Jane Doe',
  '등급': 'Role',
  '보기만': 'View only',
  '실행까지': 'Can run',
  '운영': 'Admin',
  '— 마지막 운영 계정이라 등급을 낮출 수 없습니다. 먼저 다른 사람을 운영으로 올립니다':
    '— the last admin cannot be demoted. Promote someone else to admin first',
  '배정할 서비스': 'Services to assign',
  '먼저 서비스를 만듭니다': 'Create a service first',
  '배정받지 않은 서비스는 그 사람의 띠에 뜨지 않습니다': 'Services not assigned do not show up in their bar',
  '비밀번호는 시스템이 만듭니다. 만든 직후': 'The system generates the password. It is shown',
  '한 번만': 'only once',
  '보여 줍니다': 'right after the account is created',
  '비밀번호 재발급': 'Reissue password',
  '한 번 더 누르면 지금 비밀번호가 무효가 됩니다': 'Press once more and the current password stops working',

  // 임시 비밀번호 상자 — `<b>` 와 `<code>` 가 사이에 끼어 조각으로 나뉜다
  '의 임시 비밀번호는': "'s temporary password is",
  '입니다': '',
  '지금 적어서 본인에게 전합니다.': 'Write it down now and hand it over.',
  '닫으면 다시 볼 수 없습니다': 'Once closed it cannot be seen again',
  '— 잊으면 다시 만듭니다': '— if it is lost, issue a new one',
  '적었습니다': 'Got it',

  // 에이전트 토큰 — 작성 에이전트 계정에만 보인다
  '에이전트 토큰': 'Agent token',
  '토큰 있음': 'Token set',
  '토큰 없음': 'No token',
  '발급': 'Issue',
  '다시 발급': 'Reissue',
  '토큰 취소': 'Revoke token',
  '맥 에이전트가 지금 멈춥니다.': 'The Mac agent stops now.',
  '새 토큰을 맥에 다시 넣어야 합니다': 'The new token must be pasted into the Mac again',
  '다시 발급할 때까지 작성이 멈춥니다': 'Authoring stays stopped until a token is issued again',
  '다시 발급한다': 'Reissue now',
  '취소한다': 'Revoke now',
  '그만두기': 'Never mind',
  '의 에이전트 토큰입니다. 선택해 복사하세요': "'s agent token. Select it to copy",
  '맥 에이전트 첫 실행에서 한 번 붙여넣습니다. 방법은 docs/SETUP.md 8절':
    'Paste it once on the Mac agent first run. See docs/SETUP.md section 8',
};
