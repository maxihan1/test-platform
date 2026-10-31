// 설정 › BTS 연결 화면 글자의 영어 (도메인/BTS §8.15 · BTS-F3-05). 키는 한국어 원문이다 — {bts} 는 btsName.ts 의 제품 이름

export const BTS말: Record<string, string> = {
  '{bts} 연결': '{bts} connection',
  '{프로젝트} › {bts} 연결': '{프로젝트} › {bts} connection',
  '연결됨 · {키}': 'Connected · {키}',
  '연결 정보 입력': 'Enter connection details',
  '{bts} 자동 설정': 'Set up {bts} automatically',
  '배포 스크립트 한 줄': 'One line for the deploy script',

  // 1 · 연결 정보
  '1 · 연결 정보': '1 · Connection details',
  '저장하기 전에 {bts} 에 한 번 접속해 프로젝트 키가 맞는지 확인합니다': 'Before saving, QA Hub connects to {bts} once to check the project key',
  '{bts} 주소': '{bts} address',
  '{bts} 프로젝트 키': '{bts} project key',
  '「QA Hub AI」 계정 토큰': '"QA Hub AI" account token',
  '넣음 (…{끝}) — 바꿀 때만 넣습니다': 'Set (…{끝}) — enter only to change it',
  'QA Hub 가 실패한 테스트를 {bts} 이슈로 올릴 때 쓰는 통합계정입니다. 사람 계정과 따로 두어야 {bts} 에서 누가 올렸는지 구분됩니다':
    'The QA Hub account used to file failed tests as {bts} issues. Keep it separate from personal accounts so {bts} shows who filed what',

  // 상태 매핑
  '상태 매핑': 'Status mapping',
  'QA Hub 단계마다 {bts} 상태를 하나씩 고릅니다. 비어 있는 단계가 있으면 저장할 수 없습니다':
    'Pick one {bts} status for each QA Hub stage. You cannot save while a stage is empty',
  '{bts} 에서 불러오기': 'Load from {bts}',
  '다시 불러오기': 'Load again',
  '{bts} 에서 상태 {상태}개 · 해결 사유 {해결}개를 불러왔습니다': 'Loaded {상태} statuses · {해결} resolutions from {bts}',
  '상태': 'Status',
  '해결 사유': 'Resolution',
  '배포 대기': 'Waiting to deploy',
  'QA 요청': 'QA requested',
  'QA 검토': 'QA review',
  '개발 요청': 'Dev requested',
  '코드 리뷰': 'Code review',
  '닫힘': 'Closed',
  '화면이 맞음': 'Screen is right',
  '테스트 문제': 'Test problem',
  '흔들림': 'Flaky',
  '환경 문제': 'Environment problem',
  '중복': 'Duplicate',

  // 코드 저장소
  '코드 저장소': 'Code repositories',
  '수정 AI 가 코드를 내려받을 저장소입니다. 애플리케이션마다 따로 저장됩니다': 'Repositories the fix AI clones. Saved per application',
  '{앱} 저장소 {번호} 이름': '{앱} repository {번호} name',
  '{앱} 저장소 {번호} 주소': '{앱} repository {번호} URL',
  '{앱} 저장소 {번호} 빼기': 'Remove {앱} repository {번호}',
  '+ 저장소 추가': '+ Add repository',

  // 2 · 자동 설정
  '2 · {bts} 자동 설정': '2 · Set up {bts} automatically',
  '내 통합계정 토큰으로 {bts} 에 아래 넷을 만듭니다. 이미 있으면 새로 만들지 않고 고칩니다':
    'Creates the four items below in {bts} with your QA Hub account token. Existing ones are updated, not duplicated',
  '웹훅': 'Webhook',
  '담당자 변경 규칙': 'Assignee change rule',
  'PR 병합 규칙': 'PR merge rule',
  '보드 「QA 검토」 칸': 'Board "QA review" column',
  '이슈 생성 · 상태 변경을 QA Hub 로 보냅니다': 'Sends issue creation · status changes to QA Hub',
  '담당자가 바뀌면 QA Hub 를 부릅니다': 'Calls QA Hub when the assignee changes',
  'PR 이 병합되면 QA Hub 를 부릅니다': 'Calls QA Hub when a PR is merged',
  '실패로 올린 이슈가 이 칸에 섭니다': 'Issues filed from failures land in this column',
  '권한 없음': 'No permission',
  '접속하지 못함': 'Could not connect',
  '실패 ({코드})': 'Failed ({코드})',
  '웹훅은 {bts} 시스템 관리자만 만들 수 있습니다. 관리자에게 이 화면에서 다시 눌러 달라고 요청해 주세요':
    'Only a {bts} system admin can create the webhook. Ask an admin to press it again on this screen',
  'PR 병합 규칙은 {bts} 프로젝트에 GitHub 연결이 있어야 동작합니다': 'The PR merge rule only fires when the {bts} project is connected to GitHub',
  '저장하고 {bts} 자동 설정': 'Save and set up {bts}',
  '연결 해제': 'Disconnect',
  '{bts} 연결 해제': 'Disconnect {bts}',
  '연결을 해제하면 이 프로젝트의 실패 판정은 QA Hub 에서 합니다': 'After you disconnect, failures in this project are judged in QA Hub',

  // 3 · 배포 스크립트 한 줄
  '3 · 배포 스크립트 한 줄': '3 · One line for the deploy script',
  'deploy.sh 는 회사 배포 서버에 있어 QA Hub 가 고칠 수 없습니다. 아래 한 줄을 deploy.sh 마지막에 넣어 주세요':
    "deploy.sh lives on your company's deploy server, so QA Hub cannot edit it. Add the line below at the end of deploy.sh",
  '배포 알림 토큰': 'Deploy notification token',
  '발급 전 · 이 프로젝트 전용': 'Not issued · this project only',
  '방금 발급했습니다 · 원문은 지금만 보입니다': 'Just issued · the token is shown only now',
  '발급': 'Issue',
  '복사': 'Copy',
  '복사했습니다': 'Copied',
  '복사하지 못했습니다. 글을 직접 골라 복사해 주세요': 'Could not copy. Select the text and copy it yourself',

  // 이 화면의 오류 (SettingsBts.tsx 연결오류)
  '{bts} 에 접속하지 못했습니다. 주소 · 프로젝트 키 · 「QA Hub AI」 계정 토큰을 확인해 주세요':
    'Could not connect to {bts}. Check the address · project key · "QA Hub AI" account token',
  '주소를 바꾸면 「QA Hub AI」 계정 토큰을 다시 넣어야 합니다': 'If you change the address, enter the "QA Hub AI" account token again',
  '처음 연결할 때는 「QA Hub AI」 계정 토큰을 넣어야 합니다': 'Enter the "QA Hub AI" account token for the first connection',
  '비어 있는 단계가 있습니다. 모든 단계에 {bts} 상태를 골라 주세요': 'Some stages are empty. Pick a {bts} status for every stage',
  '내 계정에 통합계정 토큰이 없습니다. 왼쪽 아래 내 메뉴 › 통합계정 토큰에 넣은 뒤 다시 눌러 주세요':
    'Your account has no QA Hub account token. Add one under your menu (bottom left) › QA Hub account token, then press again',
  '이 서버의 공개 주소(PLATFORM_PUBLIC_URL)가 없어 {bts} 가 QA Hub 를 부를 수 없습니다':
    'This server has no public address (PLATFORM_PUBLIC_URL), so {bts} cannot call QA Hub',
};
