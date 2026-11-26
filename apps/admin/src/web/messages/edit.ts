// 케이스 고치기 화면 글자의 영어 (도메인/카탈로그 §8.1 · 도메인/작성 §3.6 「★ 케이스 고치기」). 키는 한국어 원문이다
// 작성 표(authoring.ts)가 300줄에 닿아 따로 둔다 — 케이스 상세 · 목록 · 작성 상세가 같이 쓴다

export const 고치기말: Record<string, string> = {
  // 케이스 상세 (CaseEdit.tsx)
  '코드 기본값 변경 요청': 'Request a code default change',
  '케이스에 적힌 기대 결과입니다. 변경한 칸만 작성 요청으로 보내고, 반영하면 다음 실행부터 이 값이 기본값이 됩니다':
    'These are the expected results written in the case. Only the fields you change go into the authoring request; once applied they become the defaults for the next runs',
  '코드에서 변경할 수 있는 기대 결과 칸이 없습니다': 'This case has no expected result that can be changed in code',
  '{칸들} — 반영되면 이 저장값은 삭제됩니다': '{칸들} — the saved value will be removed once merged',
  '요청을 보냈습니다.': 'Request sent.',
  '작성 요청 {번호}번': 'Authoring request #{번호}',
  '반영은 테스트 작성 화면에서 합니다.': 'Merge it from the test authoring screen.',
  '요청 보내기': 'Send request',
  '케이스 삭제 요청': 'Request case deletion',
  '{번호} 케이스 삭제를 요청할까요?': 'Request deleting case {번호}?',
  '케이스를 삭제하는 작성 요청을 만들고 반영은 테스트 작성 화면에서 합니다. 잘못 보냈으면 그 화면에서 요청을 삭제할 수 있습니다':
    'Creates an authoring request that deletes the case; merge it from the test authoring screen. If you sent it by mistake, delete the request there',
  '삭제하면 이 케이스를 쓰는 E2E 시나리오가 더 이상 실행되지 않습니다. 실행 기록은 남습니다.':
    'E2E scenarios that use this case stop running once it is deleted. Run history is kept.',
  '이 케이스를 쓰는 E2E 시나리오 {수}개 — 삭제하면 다른 케이스로 변경할 때까지 실행할 수 없습니다':
    '{수} E2E scenarios use this case — once it is deleted they cannot run until you swap in another case',

  // 케이스 목록에서 고른 것 (CaseBulkEdit.tsx)
  '삭제 요청': 'Request deletion',
  '선택한 {건수}건 삭제 요청': 'Request deleting {건수} selected',
  '삭제 요청 보내기': 'Send deletion request',
  '케이스 파일을 삭제하는 PR 을 등록합니다. 반영하면 실행 대상에서 빠지고, 이 케이스를 쓰는 E2E 시나리오도 더 이상 실행되지 않습니다. 실행 기록은 남습니다.':
    'This opens a PR that deletes the case files. Once merged they are no longer run, and E2E scenarios that use them stop running too. Run history is kept.',
  '비활성 {수}건은 제외했습니다': '{수} inactive left out',
  '테스트 프로시저의 케이스 {수}건은 작성 요청으로 보냅니다. 프로시저에서 제거하고 다시 실행한 뒤 PR 을 등록합니다':
    '{수} case(s) in a test procedure go as an authoring request. They are removed from the procedure, which is run again before the PR opens',
  '테스트 프로시저의 케이스라 작성 요청으로 보냅니다. 프로시저에서 제거하고 다시 실행한 뒤 PR 을 등록합니다':
    'This case is in a test procedure, so it goes as an authoring request. It is removed from the procedure, which is run again before the PR opens',
  '나머지 {수}건은 보내지 못했습니다. {까닭}': 'The other {수} could not be sent. {까닭}',
  '한 번에 {상한}건까지 요청할 수 있습니다. 선택한 것을 줄이세요': 'You can request up to {상한} at a time. Select fewer cases',

  // 작성 화면 (authoringView.ts · authoringStatus.ts · AuthoringRuns.tsx · AuthoringEditParts.tsx)
  '케이스 수정': 'Case change',
  '수정 중': 'Changing',
  '다시 적용': 'Re-apply',
  '수정할 내용': 'Changes',
  삭제: 'Delete',
  확정: 'Confirm',
  '기대 결과 {칸}: {값}': 'Expected {칸}: {값}',
  '변경 전 값은 PR 본문에 있습니다.': 'The previous values are in the PR description.',
  '목록에서 사라집니다. GitHub 의 PR 은 남으니 GitHub 에서 닫으세요.':
    'It disappears from the list. The PR stays open on GitHub — close it there.',
  '작성 진행 알림이 한동안 없습니다. 검사가 길어지는 중일 수도 있습니다. 응답이 없는 것 같으면 작성 중단을 누른 뒤 다시 적용하세요':
    'No word from authoring for a while. The checks may just be slow. If it looks stuck, stop it, then re-apply',
  '작성 순서를 기다리는 중입니다. 이 페이지를 닫아도 됩니다.': 'Waiting for its authoring turn. You can close this page.',
  '테스트를 반영하는 중입니다. 검사가 완료되길 기다려 반영하므로 몇 분 걸립니다. 이 페이지를 닫아도 됩니다.':
    'Merging the tests. It waits for the checks to finish, so it takes a few minutes. You can close this page.',
  '반영이 실패했습니다. 다른 변경과 부딪혔으면 지금까지 반영된 케이스를 기준으로 같은 내용으로 다시 수정한 뒤 반영하세요.':
    'The merge failed. If it clashed with another change, re-apply the same changes on the cases applied so far, then apply.',
  // 고치기 에이전트의 단계 글 (authoringStatus.ts 단계글)
  '케이스를 수정하는 중': 'Changing cases',
  '검사하는 중': 'Checking',
  '케이스를 수정해 PR 로 등록하는 중입니다. 이 페이지를 닫아도 됩니다.': 'Changing the cases and opening a PR. You can close this page.',
  '테스트가 반영됐습니다. 케이스 목록에서 변경된 것을 볼 수 있습니다.': 'The tests were merged. The changes are in the case list.',
  '테스트가 반영됐습니다. 서버가 반영된 케이스를 아직 못 받아 왔습니다. 받아 온 뒤 케이스 목록의 「⋯ › 케이스 목록 새로고침」을 누르면 변경된 것이 보입니다.':
    'The tests were merged, but the server has not received the applied cases yet. Once it has, press “Rescan” on the case list to see the changes.',
  '수정한 케이스 검토': 'Review the changed cases',
  '검토용 PR 로 등록되었습니다. 변경된 줄을 읽어 보고 이상하면 삭제하세요.': 'A PR is open for review. Read the changed lines and delete it if something is wrong.',
  '수정한 케이스 보기 (PR)': 'View the changed cases (PR)',
  '지금까지 반영된 케이스를 기준으로 같은 내용으로 다시 수정합니다. 지금까지의 실행은 실행 기록에 남습니다.':
    'Applies the same changes again on top of the cases applied so far. Earlier runs stay in the run history.',
  '다시 적용할 권한이 없습니다. 관리자에게 작성 쓰기 권한을 요청하세요.': 'You do not have permission to re-apply. Ask an admin for authoring write access.',
  '한동안 응답이 없는 수정을 중단합니다. 중단한 뒤 다시 적용할 수 있습니다.': 'Stops the change that has been quiet for a while. You can re-apply it afterwards.',
  '같은 수정 내용으로 다시 적용할까요?': 'Apply the same changes again?',
  '다시 적용 시작': 'Re-apply',
  '같은 수정 내용으로 작성 요청을 다시 만들어 처음부터 다시 작성합니다. 시작한 작성은 「삭제」로 목록에서 없앨 수 있지만 지금까지 쓴 시간은 복원할 수 없습니다': 'Creates a new authoring request with the same changes and rewrites from the start. You can remove the new request with Delete, but the time spent cannot be restored',
  '코드 기본값 변경을 요청할까요?': 'Request the code default change?',
  '변경 요청': 'Request the change',
  '변경한 기대 결과 칸만 담아 작성 요청을 만들고 반영은 테스트 작성 화면에서 합니다. 잘못 보냈으면 그 화면에서 요청을 삭제하고 값을 수정해 다시 보낼 수 있습니다': 'Creates an authoring request with only the expected-value fields you changed; the merge happens on the test authoring screen. If you sent it by mistake, delete the request there, fix the values and send again',
};
