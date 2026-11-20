<!-- guide-version: 8 -->
# ARG 서비스 가이드 요약

## 서비스
Unity 「Boss Room」을 고친 Android 협동 액션 RPG(패키지 com.maxihan.bossroom)다. 로그인 → 로비에서 영웅 카드 고르기 → 「준비!」 → 던전에서 임프와 보스를 잡는다.
레벨 · 골드 · 가방 · 장비 · 상점 · 일일 퀘스트 · 우편 · 채팅 · 친구 · 파티 · 길드가 있다. 게임 서버는 bossroom.maxihan.com(WebSocket), 계정 · 데이터는 API 서버(ARI)가 맡는다.

## 테스트할 때 지킬 것
- 게임 케이스는 SDK 를 넣은 QA 빌드로 돈다. 게임 케이스끼리 동시에 돌리지 않는다 — 같은 서버 접속자가 모두 준비해야 던전이 열린다
- 첫 화면 로그인 창은 아이디 · 비밀번호 → 「게임 시작」, 로비는 영웅 카드 → 「준비!」, 메뉴는 가방 · 상점 · 퀘스트 · 우편 · 친구 · 길드다(로비 왼쪽 · 던전 오른쪽)
- 적이 플레이어에게 주는 피해에 인원 보정이 곱해진다(혼자 0.5 · 둘 0.75 · 셋 이상 1). 인원을 적지 않은 「맞음」 예를 보려면 봇 둘을 같이 던전에 넣는다
- 상태 만들기 길: 폰 접속 전에 있어야 하는 것(다른 접속자 · 인원 가득 · 같은 계정 접속 · 로그인 실패 · 새 계정 · 캐릭터 값)은 시험 주소, 접속 뒤 내 캐릭터 상태(레벨 · 골드 · 체력 · 자리 · 적 · 전리품 · 퀘스트)는 채팅 칸 /gm 명령, 우편 지급 · 제재 · 점검 · 공지는 운영 API
- 시험 주소는 게임 주소의 /test, 운영 API 는 API 서버 주소의 /opsapi 다. 둘 다 어드민 키 머리를 쓴다(키는 환경값에만 둔다)
- GM 명령(/gm killall · killboss · god · heal · faint · hp · exp · level · gold · tp boss · tp switch · spawn imp|thrower|boss|pot · loot · quest reset · stat · data monster|skill|bag|item)은 시험 서버에서만 듣는다. hp · tp · spawn · killall · killboss · heal · faint 는 던전 안에서만 된다. 결과는 내 화면 알림 「[GM] …」, stat · data 는 채팅 창 「[알림] [GM] …」 줄이다
- /gm tp boss 는 「도착」 알림을 기다린 뒤 다음 동작을 한다. 적을 누르는 케이스는 /gm spawn 으로 불러낸 오브젝트를 누른다(좌표 없음)
- 받는 피해 최솟값은 /gm level 30 · 「사슬 갑옷」 장착 · 혼자 던전 · /gm killall 뒤 /gm spawn imp 로 맞고 /gm stat 둘째 줄 「받은피해」로 읽는다
- 레벨 · 골드 · 전리품 고정을 바꾼 케이스는 끝에서 처음 값으로 되돌린다(전리품은 /gm loot off)
- 봇: POST /test/bot/start(계정 또는 손님) · /test/bot/do(친구 · 파티 · 길드 · 채팅 · 상점 · 로비 seat · ready · gm) · GET /test/bot/log(봇이 본 알림 · 채팅 · 초대) · /test/bot/stop. 켠 봇은 끝에서 반드시 끈다
- 화면에 버튼이 없어 폰으로 못 보내는 요청(상점에 없는 아이템 구매 · 장착 중 판매 · 물약 장착 · 길드가 있는데 만들기)은 봇에게 보내게 하고 봇 log 의 오류 알림을 본다
- 다음 게임 API 요청 실패: POST /test/fail {path, count}(/api/login · getplayercharacters · saveplayercharacter · serverstatus · savemailmessage). 건 바로 뒤에 그 요청을 일으킨다
- 접속 끊기 POST /test/kick · 계정 되돌리기 POST /test/reset(mode new 는 새 계정에만 · base 는 우편함까지 비운다 · raw) · 기록에 없는 첨부 우편 POST /test/mail
- 우편 수 · 빈 우편함을 보는 케이스는 시작에서 base 로 되돌린 뒤 필요한 우편만 넣는다. 접속 중이면 우편 지급 뒤 5초 안팎에 「새 우편」 알림이 뜬다
- 점검을 켠 케이스는 끝에서 반드시 끈다. 제재는 두 번째 플레이어에만 걸고 끝에서 푼다. 공지는 제목을 [QA] 로 시작하고 끝에서 지운다. 지급 · 회수 시험은 두 번째 플레이어로, 재화는 골드(Gold)
- 아이템 이름은 GET /opsapi/items/known 에 있는 것만 쓴다. 판매가 최소 1 골드는 상점 「조약돌」(3 골드)로 본다
- 손가락을 올려 둔 동안만 보이는 말풍선은 game.touchDown 으로 눌러 둔 채 확인하고 finally 에서 touchUp 한다(0.5초 뒤 뜬다)
- 머리 위 숫자(DamageNumberEnemy · DamageNumberMine · HealNumber)는 0.9초 뒤 사라진다 — 상태를 만든 바로 뒤 waitFor 로 기다린다
- 결과 장면(PostGame) 「Directional Light」 Light.color 가 승패에 따라 다르다. 승리는 /gm tp boss → /gm killboss, 패배는 /gm faint
- 레벨 곡선 · 퀘스트 표를 돌려주는 API 는 없다. 몬스터 · 스킬 · 아이템 표 값은 /gm data 로 읽는다
- 계정 역할: 일반 회원(폰) · 두 번째 플레이어(봇) · 세 번째 · 네 번째 플레이어(봇 — 파티 · 길드 · 친구 인원 채우기, 시작과 끝에서 base) · 새 계정(「처음 들어온 캐릭터」 케이스만, 시작에서 new). 실행마다 일반 회원 · 두 번째 플레이어는 기준 상태(레벨 1 · 골드 200 · 체력 물약 3 · 친구 · 길드 · 우편 없음)로 돌아간다. 계정마다 캐릭터는 하나이고 아이디와 같은 이름이다
- 손님 봇은 파티 · 길드 · 친구 초대를 받지 못한다 — 서버 인원 · 로비 자리 채우기에만 쓴다
- 화면 좌표를 누르는 길과 엔터 키를 보내는 길은 없다(PC 전용 요구는 폰 케이스 대상이 아니다)

## 배운 것
- 요령 · 데이터 — 손님 봇({bot})은 파티 · 길드에 초대할 수 없다(「접속 중인 캐릭터만 초대할 수 있습니다」). 셋째 · 넷째 사람은 세 번째 · 네 번째 플레이어 계정 봇으로, 다섯째는 새 계정 봇으로 채운다
- 요령 · 데이터 — /gm data monster · skill 결과에는 「끝」 줄이 없다(bag 만 있다). 줄 수가 더 늘지 않으면 다 온 것으로 본다. 이동 속도는 ServerCharacter.CharacterClass.Speed 로 읽는다(NavMeshAgent.speed 는 QA 빌드에 없다)
- 요령 · 데이터 — 첨부 없는 우편은 첨부를 받아서 만든다. 지급한 바로 뒤 회수한 우편은 우편함에 아예 안 보인다
- 요령 · 데이터 — 빈 우편함 안내 「받은 우편이 없습니다」도 우편 목록 Row 안에 그려진다. 우편 줄을 셀 때는 「받기」 · 「삭제」가 있는 Row 만 센다
- 요령 · 데이터 — 공지 띠 글은 「[점검]」 · 「[공지]」 머리에 색 태그가 붙어 글자 찾기로 안 잡힌다. 로그인 화면 띠 글은 NoticeBar/Bg/Text 를 태그를 빼고 견주고, 바탕색은 NoticeBar/Bg 의 Image 로 읽는다
- 요령 · 공용 서버 — 앞 케이스가 던전을 남기면 봇의 seat 가 「로비(영웅 고르기)가 아닙니다」로 막힌다. 봇을 쓰는 케이스는 시작에서 봇을 끄고, 던전 입장은 봇과같이던전으로를 쓴다(던전이 진행 중이면 봇이 바로 던전에 들어간다)
