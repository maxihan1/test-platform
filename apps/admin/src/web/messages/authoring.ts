// 테스트 작성 화면 글자의 영어 (SPEC §8 · 도메인/작성 §3.6). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 작성말: Record<string, string> = {
  // 줄의 종류와 상태
  재실행: 'Rerun',
  '자료 올리는 중': 'Uploading files',
  '대기 중': 'Queued',
  '작성 중': 'Writing',
  // 서버가 주는 상태가 아니다. 신호가 오래 끊긴 것을 화면이 판정했다 — 까닭은 모르니 끊긴 사실만 말한다
  '응답 없음': 'No response',
  끝남: 'Ended',
  '기록 없음': 'No record',
  실패: 'Failed',

  // 빈 목록
  '아직 작성을 요청한 기록이 없습니다': 'No authoring requests yet',
  '기획서를 넣으면 여기에 줄이 생깁니다': 'Add a spec and a row appears here',
  '작성 요청이 들어오면 여기에 줄이 생깁니다': 'A row appears here when authoring is requested',
  '이 쪽에는 요청이 없습니다': 'No requests on this page',

  // 새 요청 폼 — 파일과 피그마 주소를 한 세트로 (도메인/작성 §7 「자료」)
  '새 작성': 'New request',
  '새 작성 요청': 'New authoring request',
  '피그마 주소': 'Figma links',
  '한 줄에 하나씩': 'One per line',
  '테스트 작성 시작': 'Start writing tests',
  '시작하는 중…': 'Starting…',
  'API 문서 버전 {버전}': 'API doc version {버전}',
  // API 애플리케이션의 새 요청 폼 (도메인/작성 §7 「AUTHOR API 문서 판」)
  '버전 {버전} (현재 버전)': 'Version {버전} (current)',
  '버전 {버전}': 'Version {버전}',
  'API 문서가 아직 없습니다. API 문서 화면에서 먼저 받습니다': 'There is no API doc yet. Fetch one on the API docs screen first',
  'API 문서 화면으로': 'Go to the API docs screen',
  '지원하지 않는 파일입니다. PDF · 워드 · 엑셀 · md · txt · csv 만 올릴 수 있습니다': 'File type not accepted. Only PDF · Word · Excel · md · txt · csv',
  '지원하지 않는 파일입니다. PDF · 워드 · md · txt 만 올릴 수 있습니다': 'File type not accepted. Only PDF · Word · md · txt',
  '이 요청은 대기열에 들어가지 못했습니다. 새 요청으로 다시 넣으세요': 'This request was not queued. Submit a new request',
  '이 요청은 대기열에 들어가지 못했습니다. 폐기하고 새 요청으로 다시 넣으세요': 'This request was not queued. Discard it and submit a new request',
  '파일 하나가 크기 상한을 넘었습니다': 'The file is larger than the per-file limit',
  '빈 파일은 올릴 수 없습니다': 'Empty files cannot be uploaded',
  '피그마 주소 형식이 맞지 않습니다. 피그마 디자인 파일의 링크를 넣으세요 (FigJam은 받지 않습니다)':
    'Not a Figma link we accept. Paste a Figma design file link (FigJam is not accepted)',
  '파일 이름에 쓸 수 없는 글자(따옴표 · 빗금 · ..)가 있습니다': 'The file name has characters that are not allowed (quotes · slashes · ..)',
  '한 요청에 넣을 수 있는 자료 개수를 넘었습니다': 'Too many attachments for one request',
  '자료가 하나도 없습니다. 파일이나 피그마 주소를 넣으세요': 'No attachments. Add a file or a Figma link',
  '요청한 사람만 자료를 올릴 수 있습니다': 'Only the requester can upload attachments',
  // 피그마를 미리 열어 보기 (도메인/작성 §7 「자료」 「미리 열어 보기」)
  '이 애플리케이션에는 피그마 토큰이 없어 피그마 주소를 받을 수 없습니다.': 'This application has no Figma token, so Figma links cannot be accepted.',
  '설정 > 애플리케이션에서 피그마 토큰을 넣으세요': 'Add a Figma token in Settings > Applications',
  '운영자에게 피그마 토큰을 넣어 달라고 요청하세요': 'Ask an operator to add a Figma token',
  '피그마가 이 애플리케이션의 토큰을 받아 주지 않습니다. 토큰이 틀렸거나 만료됐거나 읽기 권한이 모자랍니다.': 'Figma does not accept this application’s token. It is wrong, has expired, or lacks read permission.',
  '설정 > 애플리케이션에서 새 피그마 토큰을 넣으세요': 'Add a new Figma token in Settings > Applications',
  '운영자에게 새 피그마 토큰을 넣어 달라고 요청하세요': 'Ask an operator to add a new Figma token',
  '피그마 파일을 열지 못했습니다. 파일이 없거나 이 토큰으로 볼 권한이 없습니다 ({주소})':
    'Could not open the Figma file. It does not exist or this token cannot view it ({주소})',

  // 상세
  '지금 하는 일': 'Now doing',
  '요청한 사람': 'Requested by',
  '요청한 시각': 'Requested at',
  번호: 'No.',
  '요청 정보': 'Request',
  '대조할 화면': 'Screen to compare',
  '넣은 자료': 'Inputs given',
  '{수}건': '{수}',

  // 시작 모달 (DESIGN.md 「모달」 ①)
  '테스트 작성을 시작했습니다': 'Test writing started',
  '상세 페이지로': 'Open details',
  '#{번호} 요청이 접수됐습니다.': 'Request #{번호} was accepted.',
  '창을 닫아도 작성은 계속됩니다. 테스트 작성 목록의 #{번호} 줄을 누르면 언제든 다시 볼 수 있습니다.':
    'Writing continues after you close this. Click the #{번호} row in the test writing list to see it again any time.',

  // Status 카드 (DESIGN.md 「작성 상태」)
  '반영 중': 'Merging',
  '기획서 {수}': 'Specs {수}',
  '피그마 {수}': 'Figma {수}',
  단계: 'Steps',
  준비: 'Prepare',
  '자료 · PRD 읽기': 'Read inputs · PRD',
  '케이스 작성': 'Write cases',
  '저장 · PR 생성': 'Save · create PR',
  '작성 순서를 기다리는 중': 'Waiting for its authoring turn',
  '자료 올리기가 끝나지 않았습니다': 'File upload did not finish',
  시간: 'Time',
  '{시간} 걸림 (시작 {시작})': 'took {시간} (started {시작})',
  '{지난} 지남 / 한도 {한도}': '{지난} elapsed / limit {한도}',
  '{지난} 지남': '{지난} elapsed',
  '평소보다 {넘은} 더 걸리고 있습니다': 'Taking {넘은} longer than usual',
  '약 {시간} 남음 · {시각} 종료 예상 · 최근 {수}건 기준': 'About {시간} left · expected to end {시각} · based on the last {수}',
  '시작 {시각}': 'started {시각}',
  '늦어도 {시각} 완료': 'done by {시각} at the latest',
  '작성한 케이스 파일': 'Case files written',
  '탐색한 화면': 'Screens explored',
  // 에이전트가 올리는 단계 글을 화면에 보일 글로 옮긴 것 (authoringStatus.ts 의 화면글). 에이전트 글의 정본은 scripts/authoring-*.ts 의 손.단계('…')
  '작업 폴더를 만드는 중': 'Preparing the work folder',
  '자료 · PRD 를 읽는 중': 'Reading inputs · PRD',
  '케이스를 만드는 중': 'Writing cases',
  '저장하고 PR 을 만드는 중': 'Saving and creating the PR',
  '대조 결과를 저장하는 중': 'Saving comparison results',
  '겹치는 케이스를 보는 중': 'Reviewing overlapping cases',
  '채운 케이스를 3회 돌리는 중': 'Running the filled cases 3 times',
  '보관한 작업 폴더가 없어 처음부터 하는 중': 'No saved work folder, starting from scratch',
  '원본에 차이를 표시하는 중': 'Marking differences on the original',

  // 목록 한 줄 — 날것 단계 글 대신 (authoringStatus.ts 의 목록글)
  '{단계} 단계에서 멈췄습니다': 'Stopped at {단계}',
  '테스트 반영 완료': 'Tests merged',
  '시작 전에 멈췄습니다': 'Stopped before it started',
  '케이스 파일 {수}개를 만들었습니다': 'Made {수} case files',
  '케이스를 PR 로 올렸습니다': 'Opened the cases as a PR',

  // 다음 단계 (2026-09-28 「해야 할 일」에서 바꿨다 — 고르는 상황에 시키는 말투가 안 맞았다)
  '다음 단계': 'Next steps',
  '작성 응답이 끊겼습니다. 작성 중단을 누른 뒤 이어서 작성하세요':
    'Authoring stopped responding. Press Stop writing, then continue writing',
  '지금은 없습니다. 작성이 끝나면 여기에 검토할 것이 생깁니다. 이 페이지를 닫아도 됩니다.':
    'Nothing for now. Things to review appear here when writing ends. You can close this page.',
  '아직 시작 전이라 누르면 바로 취소됩니다.': 'It has not started, so it is cancelled right away.',
  '중단하면 30초 안에 멈춥니다. 만든 것은 남겨 두어 이어서 작성할 수 있습니다.':
    'Stopping takes up to 30 seconds. What was made is kept so you can continue writing.',
  '테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.': 'The tests were merged. The new cases are in the case list.',
  '올라간 PR 이 없습니다. 아래 만든 것을 확인하세요.': 'No PR was opened. Check the outputs below.',
  '만든 케이스 검토': 'Review the new cases',
  '검토용 PR 로 올라갔습니다. 읽어 보고 이상하면 PR에 댓글을 남기세요.':
    'It was opened as a draft PR. Read it and leave a comment on the PR if something looks wrong.',
  '만든 케이스 보기 (PR)': 'View the new cases (PR)',
  '기획서와 다른 곳 {수}건 확인': 'Check {수} differences from the spec',
  '표시한 기획서 내려받기': 'Download the marked spec',
  '테스트 반영하기': 'Merge the tests',
  '검토가 끝나면 PR 을 반영해 케이스 목록에 올립니다.': 'After review, apply the PR to add the cases to the list.',
  '반영하는 중': 'Merging…',
  '반영은 운영 권한이 있는 사람만 할 수 있습니다.': 'Someone with admin rights merges it.',
  '같은 자료로 다시 작성': 'Write again with the same inputs',
  '원인을 먼저 고친 뒤 누르세요. 넣었던 자료 그대로 같은 요청에서 처음부터 다시 돌립니다.':
    'Fix the cause first. This runs the same request again from the start with the same inputs.',
  '대상 서버와 시작 주소도 원본 그대로 씁니다.': 'It uses the same target server and start URL as the original.',
  '넣었던 자료 그대로 같은 요청에서 처음부터 다시 돌립니다. 지금까지의 실행은 실행 기록에 남습니다.':
    'This runs the same request again from the start with the same inputs. Earlier runs stay in the run history.',

  // 이어하기 (도메인/작성 §7 「이어하기」)
  '이어서 작성': 'Continue writing',
  '이 요청은 이어서 작성할 수 없습니다. 이미 이어받았거나 보관 기간이 지났습니다. 새로 고쳐 보세요':
    'This request cannot be continued. It was already continued or its keep period is over. Refresh the page',
  '중단 전까지 만든 테스트 {수}개를 이어받아 남은 작업을 계속합니다.':
    'Takes over the {수} tests made before the stop and continues the rest.',
  '중단된 자리부터 남은 작업을 계속합니다.': 'Continues the rest from where it stopped.',
  '{날}까지 이어갈 수 있습니다.': 'You can continue until {날}.',
  '이미 이어서 작성했습니다. 아래 실행 기록을 보세요.': 'Already continued. See the run history below.',
  '보관 기간이 지나 작성 결과를 지웠습니다. 처음부터 다시 작성하세요.':
    'The keep period is over and what was made was deleted. Write again from the start.',
  '목록에서 사라집니다. 보관한 작업물도 지웁니다. 통계와 토큰 기록은 남습니다.':
    'It disappears from the list and the kept work is deleted. Stats and token records stay.',

  // 진척 · 중단 · 폐기 (도메인/작성 §7 「중단 · 폐기 · 진척」). 상태 라벨 「중단」은 실행과 같은 키(runs)를 쓴다
  진척: 'Progress',
  '{수}장': '{수}',
  '{수}개': '{수}',
  시스템: 'System',
  '사용자가 멈춤': 'Stopped by user',
  '시간초과': 'Timed out',
  '구독 한도': 'Subscription limit',
  '작성 재시작': 'Authoring restarted',
  '작성 응답 없음': 'Authoring not responding',
  '작성 중 끊김': 'Cut off while writing',
  '올리기 거절': 'Upload rejected',
  '작성 중단': 'Stop writing',
  폐기: 'Discard',
  '폐기하는 중': 'Discarding…',
  폐기됨: 'Discarded',
  '저장하고 PR 을 만드는 중 — 멈출 수 없습니다': 'Saving and opening the PR — cannot be stopped',
  '작성을 멈출까요?': 'Stop writing?',
  '이 요청을 폐기할까요?': 'Discard this request?',
  '{분}분 동안 만든 것은 남겨 두어 나중에 이어서 작성할 수 있습니다.':
    'What was made in {분} min is kept so you can continue writing later.',
  '아직 시작 전이라 바로 취소됩니다.': 'It has not started yet, so it is cancelled right away.',
  '목록에서 사라집니다. 통계와 토큰 기록은 남습니다.': 'It disappears from the list. Stats and token records stay.',
  // 목록 옆 「새 작성에 넣는 자료」 — 종류마다 줄이 다르다 (kind.ts 작성자료 · WEB-F7-16)
  '새 작성에 넣는 자료': 'What a new request takes',
  '기획서(docx · pdf)': 'Spec (docx · pdf)',
  '피그마 화면': 'Figma screens',
  '실제 화면과 대조 — 크롤러가 대상 서버를 열어 기획서와 다른 화면을 찾습니다':
    'Compare with the live screen — the crawler opens the target server and finds screens that differ from the spec',
  '앱 화면 읽기 — 디바이스 팜에서 폰 하나를 잡아 앱을 깔고 첫 화면부터 눌러 가며 요소를 읽습니다':
    'Reading app screens — takes one phone from the device farm, installs the app and reads elements from the first screen on',
  '기획서 · 확률표': 'Spec · probability table',
  '게임 화면 읽기 — 디바이스 팜에서 폰 하나를 잡아 게임을 깔고 로그인 창부터 창을 하나씩 열어 오브젝트를 읽습니다':
    'Reading game screens — takes one phone from the device farm, installs the game and opens each window from login to read its objects',
  'API 문서 버전 — 지난 버전과 달라진 엔드포인트만 다시 작성합니다': 'API doc version — only endpoints changed since the last version are rewritten',
  '기획서(있으면)': 'Spec (if any)',
  // 역방향 — 기획서와 실제 화면을 대조한다 (도메인/작성 §3.6 「★ 역방향」)
  '실제 화면과 대조': 'Compare with the live screen',
  '화면과 대조': 'Screen compare',
  '시작 주소': 'Start URL',
  '기획서가 있으면 기획서 화면을 먼저 작성하고, 반영되면 기획서에 없는 화면을 이어서 작성합니다. 기획서 없이 보내면 PRD 에 아직 없는 화면만 작성합니다':
    'With a spec, the spec screens are written first and, once applied, the screens it does not cover follow. Without a spec, only screens not yet in the PRD are written',
  '이 애플리케이션에는 대상 서버가 없습니다. 설정 > 애플리케이션에서 먼저 넣으세요':
    'This application has no target servers. Add one in Settings > Applications first',
  '이 대상 서버에는 테스트 계정이 없거나 실서비스 서버로 체크돼 있습니다. 설정 > 애플리케이션에서 확인하세요':
    'This target server has no test account or is marked as production. Check Settings > Applications',
  '시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다':
    'The start URL must be on the same address (domain · port) as the chosen target server',
  '대상 서버 주소에서 시작': 'Starts from the target server address',
  '화면만 — 기획서 없이 PRD 에 없는 화면만 작성합니다': 'Screen only — without a spec, writes only the screens not in the PRD',
  '원본 요청 #{번호}의 입력을 그대로 씁니다': 'Uses the inputs of the original request #{번호} as they are',
  '원본 요청 #{번호}의 자료': 'Input of the original request #{번호}',
  '입력 자료': 'Inputs',
  산출물: 'Outputs',
  '기획서와 화면의 차이': 'Differences between spec and screen',
  종류: 'Kind',
  자리: 'Where',
  기획서: 'Spec',
  화면: 'Screen',
  케이스: 'Case',
  '기획서와 다름': 'Differs from spec',
  '화면에만 있음': 'Only on screen',
  '문서에만 있음': 'Only in spec',
  '알 수 없는 종류': 'Unknown kind',
  // 실행 기록 (도메인/작성 §7 「실행 기록」) — 번호는 하나, 실행은 차로 쌓인다
  '{차}차': 'Run {차}',
  차: 'Run',
  방식: 'How',
  처음: 'First',
  처음부터: 'From scratch',
  이어서: 'Continued',
  시작: 'Started',
  결과: 'Result',
  테스트: 'Tests',
  // 보류 케이스 (도메인/작성 §3.6 「★ 보류 케이스」 · 시안 A)
  접기: 'Collapse',
  되돌리기: 'Undo',
  '넣을 값': 'Input',
  '기대 결과': 'Expected',
  숫자: 'Number',
  글자: 'Text',
  '숫자를 넣으세요': 'Enter a number',
  저장했습니다: 'Saved',
  '칸을 벗어나면 바로 저장됩니다': 'Saved as soon as you leave the field',
  '반영하면 넣은 값을 케이스에 적고, 값을 채운 케이스를 3번 돌려 모두 통과해야 반영합니다.':
    'Applying writes your values into the cases, runs each filled case 3 times, and applies only if all pass.',
  '반영이 대기 중이거나 진행 중이라 지금은 값을 바꿀 수 없습니다': 'A merge is queued or running, so values cannot be changed now',
  '넣은 값이 이 케이스의 칸과 맞지 않습니다': 'The values do not match this case’s fields',
  '테스트 계정을 넣은 대상 서버가 없습니다. 설정 > 애플리케이션에서 넣으세요.':
    'No target server has a test account. Add one in Settings > Applications.',
  // PRD 요구사항 집계 (도메인/작성 §3.6 「★ 원장」) — Status 카드 한 줄
  'PRD 요구사항': 'PRD requirements',
  '제외 {수} (다음 작성 {다음})': 'excluded {수} (next authoring {다음})',
  '제외 {수}': 'excluded {수}',
  'PRD 밖 자료 {수}': 'files outside the PRD {수}',
  '집계 없음 — {까닭}': 'no tally — {까닭}',
  // 계정이 없어 보류된 요구 (도메인/작성 §3.6 「★ 역할별 계정」 「작성 결과 카드」)
  // 남은 요구로 이어 작성 (도메인/작성 §3.6 「★ 원장」) — 영어는 follow-up. continue 는 이어서 작성(재개)에만 쓴다
  '남은 요구로 이어 작성': 'Follow up on remaining requirements',
  '남은 요구는 #{번호} 요청이 맡았습니다.': 'Request #{번호} took the remaining requirements.',
  '#{번호} 요청 보기': 'View request #{번호}',
  '#{번호}의 남은 요구': 'Follow-up of #{번호}',
  '#{번호} 다음 · 기획서에 없는 화면': 'After #{번호} · screens not in the spec',
  '반영한 실행 기준으로 다음 요청 {다음}개 · 빠짐 {빠짐}개가 남았습니다.':
    'As of the merged run, {다음} left for the next request · {빠짐} missing.',
  '이것을 새 요청으로 작성하고 새 번호로 넘어갑니다. 남은 요구는 작성을 시작할 때 다시 셉니다.':
    'They are written as a new request, and you move to its new number. The remaining requirements are counted again when writing starts.',
  '이어 작성은 작성 요청 권한이 있는 사람만 할 수 있습니다.': 'Only people who can request writing can start a follow-up.',
  'GitHub 에서 이미 반영했어도 여기서 반영을 눌러야 남은 요구를 이어 작성할 수 있습니다.':
    'Even if the PR was applied on GitHub, apply here to follow up on the remaining requirements.',
  // 반영 때 겹침 (도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
  '번호가 겹쳐 반영할 때 새 번호를 받습니다': 'The ID overlaps, so it gets a new ID when merged',
  '반영하지 못했습니다': 'The merge did not go through',
  '같은 자료로 다시 작성하면 지금까지 반영된 케이스를 기준으로 처음부터 다시 만듭니다. 지금까지의 실행은 실행 기록에 남습니다.':
    'Writing again from the same material rebuilds on the cases applied so far. Earlier runs stay in the run history.',
  '반영 실패 까닭이 기록되지 않았습니다': 'No reason was recorded for the failed merge',

  // 새 요청 — Android 앱 애플리케이션 (도메인/러너 §5.2 종류 표)
  '앱 화면 읽기': 'Reading app screens',
  '대상 서버에 앱 파일 경로가 있으면 디바이스 팜에서 빈 폰 하나를 잡아 앱을 설치하고, 첫 화면부터 눌러 가며 요소 주소를 읽습니다. 끝나면 폰을 놓습니다':
    'If the target server has an app file path, takes a free phone from the device farm, installs the app, and taps through from the first screen to read element locators. The phone is released when done',
  '앱 케이스는 끝 검사에서 폰으로 돌려 보지 않습니다. 병합 뒤 「테스트 스크립트」에서 실행해 확인합니다':
    'App cases are not run on a phone during the final check. Run them from “Test scripts” after the merge',
  '게임 화면 읽기': 'Reading game screens',
  '디바이스 팜에서 빈 폰 하나를 잡아 게임을 설치하고, 로그인 창부터 창을 하나씩 열어 오브젝트 목록을 읽습니다. 끝나면 폰을 놓습니다':
    'Takes a free phone from the device farm, installs the game, and opens each window from the login window on to read its object list. The phone is released when done',
};
