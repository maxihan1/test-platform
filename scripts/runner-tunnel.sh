#!/usr/bin/env bash
# 맥의 러너를 클라우드 서버의 admin 이 부를 수 있게 잇는 SSH 역터널 — 토큰을 건 러너만 내보내고, 끊기면 다시 건다 (docs/SETUP.md §10 「admin 이 다른 기계에 있을 때」)
#
# 사용:  QAHUB_TUNNEL_HOST=qahubtunnel@<서버> bash scripts/runner-tunnel.sh      (러너보다 먼저 켜도 된다)
# 끄기:  Ctrl+C — 이 스크립트가 건 ssh 만 내린다
# 바꾸기: QAHUB_TUNNEL_REMOTE 서버 쪽에서 받을 주소(기본 172.17.0.1:14001) · QAHUB_RUNNER_PORT 이 맥의 러너 포트(기본 4001 — npm run runner:local)
#   172.17.0.1 은 서버의 Docker 다리 주소다. admin 이 컨테이너라 서버의 127.0.0.1 에는 못 닿는다. 바깥에서는 안 닿지만 서버의 다른 컨테이너는 닿는다
# 안전: 걸 때마다 그 포트가 토큰을 건 러너인지(토큰 없이 /progress 가 401) 보고, 아니면 걸지 않는다
set -u
PORT=${QAHUB_RUNNER_PORT:-4001}
REMOTE=${QAHUB_TUNNEL_REMOTE:-172.17.0.1:14001}
SSH=${QAHUB_TUNNEL_SSH:-ssh}         # 손으로 시험할 때 가짜 ssh 를 넣는다
RETRY=${QAHUB_TUNNEL_RETRY_S:-5}
MAX=${QAHUB_TUNNEL_MAX_S:-300}        # 곧바로 끊기면 간격을 두 배씩 — 키 거절 같은 영구 실패를 5초마다 두드려 서버의 접속 차단에 걸리지 않게
[ -n "${QAHUB_TUNNEL_HOST:-}" ] || { echo "QAHUB_TUNNEL_HOST(터널 계정@서버)를 준다 — 예 qahubtunnel@qahub.maxihan.com"; exit 2; }

# 쉬는 sleep 을 기다리는 동안에도 Ctrl+C 가 바로 듣게
rest() { sleep "$1" & wait $!; }
stop() {
  kill $(jobs -p) 2>/dev/null
  wait 2>/dev/null
  echo "터널을 내렸다"
  exit 0
}
trap stop INT TERM HUP

# 그 포트가 토큰을 건 러너인가 — 아니면 이유를 (바뀔 때만) 말하고 1. 토큰 없는 러너를 내보내면 서버의 아무 컨테이너나 케이스를 돌린다
said=
entrance() {
  local o why
  o=$(curl -s --max-time 3 -w ' %{http_code}' "http://127.0.0.1:$PORT/progress")
  case $o in
    *'RUNNER_TOKEN'*' 401') said=; return 0 ;;
    ' 000') why="러너(127.0.0.1:$PORT)가 없다 — RUNNER_TOKEN 을 주고 러너를 켠다. 열리면 건다" ;;
    *' 200') why="127.0.0.1:$PORT 의 러너에 토큰이 없다 — RUNNER_TOKEN 없이 켠 러너는 내보내지 않는다" ;;
    *) why="127.0.0.1:$PORT 에 러너가 아닌 것이 떠 있다 — 내보내지 않는다" ;;
  esac
  [ "$why" = "$said" ] || echo "$why"
  said=$why
  return 1
}

delay=$RETRY
while :; do
  entrance || { rest "$RETRY"; continue; }
  "$SSH" -o ExitOnForwardFailure=yes -o BatchMode=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
    -R "$REMOTE:127.0.0.1:$PORT" -N "$QAHUB_TUNNEL_HOST" &
  began=$SECONDS
  echo "터널 건다 — $QAHUB_TUNNEL_HOST 의 $REMOTE → 이 맥의 러너 127.0.0.1:$PORT"
  wait $!
  # 30초 넘게 붙어 있었으면 처음 간격으로, 곧바로 끊겼으면 두 배(MAX 까지)
  if [ $((SECONDS - began)) -ge 30 ]; then delay=$RETRY; else delay=$(awk -v d="$delay" -v m="$MAX" 'BEGIN { d *= 2; print (d > m ? m : d) }'); fi
  echo "터널이 끊겼다 — ${delay}초 뒤 다시 건다"
  rest "$delay"
done
