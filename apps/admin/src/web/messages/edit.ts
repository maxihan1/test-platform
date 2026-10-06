// 케이스 고치기 화면 글자의 영어 (도메인/카탈로그 §8.1 · 도메인/작성 §3.6 「★ 케이스 고치기」). 키는 한국어 원문이다
// 작성 표(authoring.ts)가 300줄에 닿아 따로 둔다 — 케이스 상세 · 목록 · 작성 상세가 같이 쓴다

export const 고치기말: Record<string, string> = {
  // 케이스 상세 (CaseEdit.tsx)
  '코드 기본값 바꾸기 요청': 'Request a code default change',
  '테스트 코드에 적힌 기대결과입니다. 바꾼 칸만 PR 로 올라가고, 반영하면 다음 실행부터 이 값이 기본값이 됩니다':
    'These are the expected results written in the test code. Only the fields you change go into the PR; once merged they become the defaults for the next runs',
  '코드에서 바꿀 수 있는 기대결과 칸이 없습니다': 'This case has no expected result that can be changed in code',
  '{칸들} — 반영되면 이 저장값은 지워집니다': '{칸들} — the saved value will be removed once merged',
  '확정 — 지금 기대값이 맞다고 판정합니다': 'Confirm — I judge the current expected results to be correct',
  '미확정 사유': 'Why unconfirmed',
  '지금 기대값': 'Current expected results',
  '요청을 보냈습니다.': 'Request sent.',
  '작성 요청 {번호}번': 'Authoring request #{번호}',
  '반영은 테스트 작성 화면에서 합니다.': 'Merge it from the test authoring screen.',
  '요청 보내기': 'Send request',
  '케이스 삭제 요청': 'Request case deletion',
  '삭제 확인': 'Confirm deletion',
  '삭제하면 이 케이스를 쓰는 E2E 시나리오가 더 돌지 않습니다. 실행 기록은 남습니다.':
    'E2E scenarios that use this case stop running once it is deleted. Run history is kept.',
  '이 케이스를 쓰는 E2E 시나리오 {수}개 — 삭제하면 다른 케이스로 바꿀 때까지 실행할 수 없습니다':
    '{수} E2E scenarios use this case — once it is deleted they cannot run until you swap in another case',

  // 케이스 목록에서 고른 것 (CaseBulkEdit.tsx)
  '삭제 요청': 'Request deletion',
  '미확정 {건수}건 확정 요청': 'Request confirming {건수} unconfirmed',
  '고른 {건수}건 삭제 요청': 'Request deleting {건수} selected',
  '삭제 요청 보내기': 'Send deletion request',
  '확정 요청 보내기': 'Send confirmation request',
  '케이스 파일을 지우는 PR 을 올립니다. 반영하면 실행 대상에서 빠지고, 이 케이스를 쓰는 E2E 시나리오도 더 돌지 않습니다. 실행 기록은 남습니다.':
    'This opens a PR that deletes the case files. Once merged they are no longer run, and E2E scenarios that use them stop running too. Run history is kept.',
  '미확정 표시를 떼는 PR 을 올립니다. 케이스마다 지금 기대값이 맞는지 보고 보내세요.':
    'This opens a PR that removes the unconfirmed mark. Check that each case’s current expected results are correct before sending.',
  '비활성 {수}건은 뺐습니다': '{수} inactive left out',
  '한 번에 {상한}건까지 요청할 수 있습니다. 고른 것을 줄이세요': 'You can request up to {상한} at a time. Select fewer cases',

  // 작성 화면 (authoringView.ts · authoringStatus.ts · AuthoringRuns.tsx · AuthoringEditParts.tsx)
  '케이스 고치기': 'Case change',
  '고치는 중': 'Changing',
  '다시 적용': 'Re-apply',
  '고치는 중에 멈췄습니다': 'Stopped while changing',
  '케이스를 고쳐 PR 로 올렸습니다': 'Changed the cases and opened a PR',
  '고칠 내용': 'Changes',
  삭제: 'Delete',
  확정: 'Confirm',
  '기대값 {칸}: {값}': 'Expected {칸}: {값}',
  '바뀌기 전 값은 PR 본문에 있습니다.': 'The previous values are in the PR description.',
  '목록에서 사라집니다. GitHub 의 PR 은 남으니 GitHub 에서 닫으세요.':
    'It disappears from the list. The PR stays open on GitHub — close it there.',
  '에이전트 소식이 한동안 없습니다. 검사가 길어지는 중일 수도 있습니다. 멈춘 것 같으면 작성 중단을 누른 뒤 다시 적용하세요':
    'No word from the agent for a while. The checks may just be slow. If it looks stuck, stop it, then re-apply',
  '에이전트 순서를 기다리는 중입니다. 이 페이지를 닫아도 됩니다.': 'Waiting for the agent. You can close this page.',
  '테스트를 반영하는 중입니다. CI 를 기다려 합치므로 몇 분 걸립니다. 이 페이지를 닫아도 됩니다.':
    'Merging the tests. It waits for CI, so it takes a few minutes. You can close this page.',
  '반영이 실패했습니다. 다른 PR 과 충돌했으면 지금 main 위에서 같은 내용으로 다시 고친 뒤 반영하세요.':
    'The merge failed. If it conflicted with another PR, re-apply the same changes on the current main, then merge.',
  // 고치기 에이전트의 단계 글 (authoringStatus.ts 단계글)
  '케이스를 고치는 중': 'Changing cases',
  '검사하는 중': 'Checking',
  '케이스를 고쳐 PR 로 올리는 중입니다. 이 페이지를 닫아도 됩니다.': 'Changing the cases and opening a PR. You can close this page.',
  '테스트가 반영됐습니다. 케이스 목록에서 「다시 스캔」을 누르면 바뀐 것이 보입니다.':
    'The tests are merged. Press “Rescan” on the case list to see the changes.',
  '고친 테스트 코드 검토': 'Review the changed test code',
  '초안 PR로 올라갔습니다. 바뀐 줄을 읽어 보고 이상하면 폐기하세요.': 'A draft PR is open. Read the changed lines and discard it if something is wrong.',
  '고친 테스트 코드 보기 (PR)': 'View the changed test code (PR)',
  '지금 main 위에서 같은 내용으로 다시 고칩니다. 지금까지의 실행은 실행 기록에 남습니다.':
    'Applies the same changes again on top of the current main. Earlier runs stay in the run history.',
  '다시 적용은 작성 쓰기 권한이 있는 사람만 할 수 있습니다.': 'Only people with authoring write access can re-apply.',
  '한동안 소식이 없는 고치기를 멈춥니다. 멈춘 뒤 다시 적용할 수 있습니다.': 'Stops the change that has been quiet for a while. You can re-apply it afterwards.',
};
