<!-- guide-version: 2 -->
# BRP 서비스 가이드 요약

## 서비스
Unity 「Boss Room」(4인 협동 액션 RPG) 포크를 Windows PC 용으로 빌드한 게임이다(실행 파일 BossRoom.exe — VISION 윈도우 PC 에 zip 으로 깐다). 로그인 → 로비에서 영웅 여덟 자리 중 하나 → 「준비!」 → 던전에서 임프 떼와 보스를 잡는다.
레벨 · 경험치 · 골드 · 가방 · 장비 · 상점 · 일일 퀘스트 · 우편 · 채팅 · 친구 · 파티 · 길드가 있다. Android 판 「Boss Room 모바일」(BRM)과 게임 서버 · 계정 · 데이터를 같이 쓴다. 게임 서버는 bossroom.maxihan.com(WebSocket), 계정 · 데이터는 API 서버(ARI)가 맡는다.

## 테스트할 때 지킬 것
- 게임 케이스는 control_cli SDK 를 넣은 윈도우 QA 빌드로 돈다. 게임 케이스끼리, BRM 케이스와도 동시에 돌리지 않는다 — 같은 서버 접속자가 모두 준비해야 던전이 열린다
- 게임 서버 · API 서버 · 운영툴은 한 서버다. 한쪽 테스트가 바꾼 상태가 다른 쪽에 그대로 보인다
- PC 입력은 game.click(왼쪽 클릭) · game.key(Unity KeyCode — Alpha1~Alpha4 · Return · Escape) · keyDown/keyUp 이다. 마우스 올리기 game.mouseMove(주소) · 휠 game.scroll(칸, { at }) · 오른쪽 클릭은 mouseMove 뒤 key('Mouse1') · 게임 껐다 켜기 game.restart(). 화면 좌표를 누르는 길은 없다 — 오브젝트를 불러내 누른다
- 말풍선(행동 버튼 · 스킬 아이콘)은 올린 지 0.5초 뒤 뜨고 마우스가 떠나면 사라진다 — mouseMove 뒤 waitFor 로 본다(가짜 마우스로 먹히는지는 아직 안 돌려 봤다)
- 적이 플레이어에게 주는 피해에 인원 보정이 곱해진다(혼자 0.5 · 둘 0.75 · 셋 이상 1). 인원을 적지 않은 「맞음」 예를 보려면 봇 둘을 같이 던전에 넣는다
- 상태 만들기 길: 접속 전에 있어야 하는 것(다른 접속자 · 인원 가득 · 같은 계정 접속 · 로그인 실패 · 새 계정 · 캐릭터 값)은 시험 주소, 접속 뒤 내 캐릭터 상태(레벨 · 골드 · 체력 · 자리 · 적 · 전리품 · 퀘스트)는 채팅 칸 /gm, 우편 지급 · 제재 · 점검 · 공지는 운영 API
- 시험 주소는 게임 주소의 /test, 운영 API 는 API 서버 주소(bossroom-api)의 /opsapi 다. 둘 다 어드민 키 머리를 쓴다(키는 환경값에만 둔다)
- GM 명령(/gm killall · killboss · god · heal · faint · hp · exp · level · gold · tp boss · tp switch · spawn imp|thrower|boss|pot · loot · quest reset · quest done · stat · data monster|skill|bag|item)은 시험 서버에서만 듣는다. hp · tp · spawn · killall · killboss · heal · faint 는 던전 안에서만. 결과는 알림 「[GM] …」, stat · data 값은 채팅 창 「[알림] [GM] …」 줄이다
- /gm tp boss 는 「도착」 알림을 기다린 뒤 다음 동작을 한다. /gm killall 은 처치 보상을 그대로 줘 레벨이 오른다 — 레벨 · 골드는 치운 뒤에 맞춘다. 던전에는 처음부터 임프 24마리가 있다
- 레벨 · 골드 · 전리품 고정을 바꾼 케이스는 끝에서 처음 값으로 되돌린다(전리품은 /gm loot off)
- 봇: POST /test/bot/start(계정 또는 손님) · /test/bot/do(친구 · 파티 · 길드 · 채팅 · 상점 · 로비 seat · ready · gm) · GET /test/bot/log · /test/bot/stop. 켠 봇은 끝에서 반드시 끈다. 손님 봇은 초대를 못 받는다
- 화면에 버튼이 없는 요청(상점에 없는 아이템 구매 · 장착 중 판매 · 물약 장착 · 길드가 있는데 만들기)은 봇에게 보내게 하고 봇 log 의 오류 알림을 본다
- 다음 게임 API 요청 실패: POST /test/fail {path, count}. 건 바로 뒤에 그 요청을 일으킨다. 로그인 때는 /api/serverstatus 를 안 읽고 /api/login 의 503 본문을 띄운다
- 접속 끊기 /test/kick · 계정 되돌리기 /test/reset(new 는 새 계정에만 · base 는 우편함까지 비움 · raw) · 기록에 없는 첨부 우편 /test/mail · 방을 로비로 /test/lobby · 미션 로그 GET /test/log?since=<번호>(clear=1 은 쓰지 않는다 · 자기 계정 줄만 고른다)
- 게임은 바뀐 캐릭터 값을 10초마다 모아 저장한다 — 운영 API 값은 20초까지 다시 읽는다(/gm stat 둘째 줄 저장대기=아니오 면 저장된 뒤). 우편 받기만 바로 저장한다
- 점검을 켠 케이스는 끝에서 반드시 끈다. 제재는 두 번째 플레이어에만 걸고 끝에서 푼다. 공지는 제목을 [QA] 로 시작하고 끝에서 지운다. 지급 · 회수 시험은 두 번째 플레이어로, 재화는 골드(Gold)
- 아이템 이름은 GET /opsapi/items/known 에 있는 것만 쓴다. 판매가 최소 1 골드는 상점 「조약돌」(3 골드)로 본다. 첨부 없는 우편은 지급 우편을 「받기」로 비워 만든다
- 머리 위 숫자는 /Showcase HUD/DamageNumberEnemy · DamageNumberMine · HealNumber 아래 Text(여럿이면 [-1] 이 가장 새것)다. 0.9초 뒤 사라진다 — 이어서 뜨는 상황을 만들고 바로 waitFor
- 글자는 모두 TextMeshProUGUI 로 읽는다. 행동 버튼은 /BossRoomHudCanvas/Hero Action Bar/Button0~3(UIHUDButton.interactable). 경험치 막대는 /Showcase HUD/PlayerBar/Bar/Fill 의 Image.fillAmount
- 상점 · 가방 · 우편 목록은 창보다 길면 아래 줄이 가린다 — 누르기 전에 줄을 끌어 올린다
- 결과 장면(PostGame) 「Directional Light」 Light.color 가 승패에 따라 다르다. 승리는 /gm tp boss → /gm killboss, 패배는 /gm faint
- 레벨 곡선 · 퀘스트 표를 돌려주는 API 는 없다. 몬스터 · 스킬 · 아이템 표 값은 /gm data 로 읽는다. 망을 끊는 길은 없다 — 서버 쪽 끊기는 /test/kick

## 테스트 데이터
- 일회용 · 일반 회원 — 게임을 직접 조작하는 계정(실행마다 기준 상태: 레벨 1 · 골드 200 · 체력 물약 3 · 친구 · 길드 · 우편 없음)
- 일회용 · 두 번째 플레이어 — 봇으로 켠다. 우편 지급 · 제재 시험 대상(실행마다 기준 상태)
- 일회용 · 세 번째 플레이어 · 네 번째 플레이어 — 파티 · 길드 · 친구 인원을 채우는 봇. 쓴 케이스는 시작과 끝에서 reset(mode base)
- 일회용 · 새 계정 — 「처음 들어온 캐릭터」 케이스만. 시작에서 reset(mode new) 뒤 로그인

## 배운 것
- 요령 · 게임 코드 — 받아 둔 코드 저장소는 원본 Boss Room 에 가깝다 — GM · 로그인 창 · 상점 · 가방 · 우편 같은 포크 기능과 장면 파일(LFS)은 없어 그 주소는 창 기록 · 조작 맵에서 옮긴다 (Assets/Scenes)
- 요령 · 게임 코드 — 안내 창은 /PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone) 을 다시 쓰고, 닫아도 오브젝트는 남은 채 CanvasGroup.alpha 0 으로 숨는다 — 닫힘은 alpha 로 본다 (Assets/Scripts/Gameplay/UI/PopupPanel.cs)
- 요령 · 게임 코드 — 로딩 화면도 지우지 않고 CanvasGroup.alpha 로 숨긴다(0.5초 뒤 0.1초 동안 흐려짐) (Packages/com.unity.multiplayer.samples.coop/Utilities/SceneManagement/ClientLoadingScreen.cs)
- 요령 · 게임 코드 — 키 4 는 행동 4 와 감정표현 띠 켜고 끄기에 같이 묶여 있고, 키 5~8 은 감정표현이다 (Assets/InputSystem/PlayerActions.inputactions)
- 요령 · 게임 코드 — 원본은 모두 준비하면 3초 뒤 던전, 보스 처치 7초 뒤 · 전원 쓰러짐 2.5초 뒤 결과 화면이다 (Assets/Scripts/Gameplay/GameState/ServerBossRoomState.cs)
- 요령 · 공용 서버 — 던전에는 처음부터 임프 24마리가 있다. /gm killall 로 먼저 치우면 처치 보상으로 레벨 · 골드가 오르니 레벨 · 골드는 치운 뒤에 맞춘다
- 요령 · 공용 서버 — 혼자 「준비!」를 누르면 3초 뒤 던전으로 넘어간다. 로비에 머물러야 하면 준비하지 않은 손님 봇을 먼저 둔다
- 요령 · 공용 서버 — 혼자 쓰러지면 2.5초 안에 결과 화면으로 넘어간다. 쓰러진 뒤를 보려면 살아 있는 봇(gm:god)을 같이 넣는다
- 요령 · 공용 서버 — 서버 상태 읽기 실패를 걸어 두고 다 안 쓰면 남은 실패가 다음 공지 · 점검 케이스를 흔든다
- 요령 · 기다리기 — 로그인 화면 공지 띠는 게임을 켤 때 읽는다. 공지 · 점검을 바꾼 뒤 로그인 화면을 보려면 게임을 다시 켠다(game.restart)
- 요령 · 기다리기 — 공지는 올린 뒤 로비 띠까지 70초 안팎, 제재 · 점검은 15~30초 걸린다
- 요령 · 기다리기 — 큰 글씨 · 머리 위 숫자 · 불러오는 화면은 잠깐 뜨니 채팅 창을 미리 열어 두고 되풀이해 읽는다. 사라지는 시간은 조작 직전에 시작 시각을 적는다
- 요령 · 데이터 — 색이 낀 글(「<b>2</b>명 접속 중」 · 「<color=…>」)은 색글떼기로 걷은 뒤 견준다
- 요령 · 데이터 — /gm data 줄은 채팅 창 아래 30줄까지라 「끝」 줄을 앵커로 읽는다. 서버 표는 숫자 칸만 주니 기획서 표도 숫자 칸만 맞춰 견준다
- 요령 · 데이터 — 상점 「행운의 반지」 · 「현자의 목걸이」 줄은 창 아래에 가려 끌어 올려야 「구매」가 눌린다
- 요령 · 데이터 — 전리품 케이스는 /gm loot none 으로 먼저 치우고, 임프를 잡은 바로 뒤 /gm loot off 로 풀고 가방을 읽는다
- 요령 · 데이터 — 길드 초대는 창이 쌓인다(Invite[0] · [1]), 파티 초대는 새 초대가 앞 초대를 지운다. 초대 창은 「수락」 · 「거절」 말고 닫히지 않는다
- 요령 · 되돌리기 — 던전 · 봇을 쓴 케이스는 로비로되돌리기, 레벨 · 골드 · 가방 · 우편 · 퀘스트를 바꾼 케이스는 바꾼 계정마다 계정되돌리기 base 를 정리에 둔다. /gm quest reset 은 케이스마다 몸통 앞에서 다시 한다
- 요령 · 기다리기 — 가짜 키(game.key)는 입력 칸에 글자를 넣지 않는다. 입력 칸이 글자를 받을 상태인지는 TMP_InputField.isFocused 로 본다
