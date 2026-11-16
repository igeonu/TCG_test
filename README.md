# Rune Duel UI 시안 (A~E)

## VS Code에서 실행하기

이 폴더(`rune-duel-ui` 상위 폴더)를 VS Code로 엽니다. **파일 → 폴더 열기**

### 방법 1: F5 (추천)
1. 왼쪽 **실행 및 디버그** 탭에서 `Rune Duel 열기 (Edge)` 또는 `(Chrome)`을 선택합니다.
2. **F5**를 누르면 Python 웹 서버(포트 5173)가 켜지고 브라우저가 열립니다.
3. 끝낼 때는 터미널 패널의 서버 작업을 휴지통 아이콘으로 종료합니다.

Python이 설치되어 있어야 합니다.

### 방법 2: Live Server 확장
1. 추천 확장 **Live Server**를 설치합니다(폴더를 열면 설치 알림이 뜹니다).
2. 오른쪽 아래 상태 표시줄의 **Go Live**를 누르면 `http://localhost:5500`에서 열립니다.

### 방법 3: 그냥 열기
`rune-duel-ui/index.html`을 더블클릭해도 동작합니다. 웹 폰트를 쓰므로 인터넷 연결이 필요합니다.

## 파일 구성
- `rune-duel-ui/index.html`: 상단 시안 전환 바, 화면 크기 맞춤
- `rune-duel-ui/js/core.js`: 효과 카드 52장, 특성, 덱 규칙, 공통 기능
- `rune-duel-ui/js/battle.js`: E안 전장 (4단계 전투 루프)
- `rune-duel-ui/js/result.js`: 명예의 전당, 카드별 활약 기록
- `rune-duel-ui/js/variant-a.js` ~ `variant-d.js`: A~D 로비 시안

주소 끝에 `#A` ~ `#E`를 붙이면 해당 시안으로 바로 열립니다.
