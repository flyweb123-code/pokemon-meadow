#!/bin/sh
# Xcode Cloud 가 저장소를 받은 직후 실행한다 (PokeGrow.xcodeproj 와 같은 폴더의 ci_scripts/ 에 있어야 함).
# 저장소에는 project.yml 만 있으니 여기서 xcodegen 으로 프로젝트를 만든다.
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH/native"

# 빌드 번호 = Xcode Cloud 빌드 번호 (업로드할 때마다 1씩 올라야 TestFlight 가 받는다)
if [ -n "$CI_BUILD_NUMBER" ]; then
  sed -i '' "s/CURRENT_PROJECT_VERSION: \"[0-9]*\"/CURRENT_PROJECT_VERSION: \"$CI_BUILD_NUMBER\"/" project.yml
fi

# 카카오 키는 저장소에 없다: Xcode Cloud 워크플로 환경 변수 KAKAO_KEY (비밀) 로 넣는다. 없으면 애플 지도로 찾는다.
if [ -n "$KAKAO_KEY" ]; then
  printf '%s\n' "$KAKAO_KEY" > PokeGrow/kakao-key.txt
fi

brew install xcodegen
xcodegen
