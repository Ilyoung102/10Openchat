
export interface ServiceItem {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  link?: string;
}

export interface ServiceCategory {
  id: string;
  label: string;
  items: ServiceItem[];
}

// Common Instructions
const NO_TALK_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 출력하세요.";

const ENGLISH_INSTRUCTION = NO_TALK_INSTRUCTION + "\n(출력 형식) 영어 회화와 한국어 해석, 단어 정보만 명확하게 표시하세요. 다른 설명은 생략합니다. 각 답변에는 상황에 맞는 텍스트 아이콘(이모지)을 사용하여 포인트를 주세요.";

const COOKING_INSTRUCTION = NO_TALK_INSTRUCTION + "\n(출력 형식) 요리 이름과 몇인분 기준인지(예: 2인분 기준)를 필히 명시하고, 상세 레시피를 깔끔하게 출력하세요. 제목과 주요 단계에 텍스트 아이콘(이모지)을 사용하여 시각적으로 꾸며주세요.";

const HEALTH_LIFE_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 2가지 항목으로 출력하세요.\n(출력 형식) 숫자(1, 2) 대신 '▣' 또는 '◈' 기호를 사용하여 항목을 구분하세요. 블로그 작성처럼 텍스트 아이콘(이모지)을 적절히 활용하여 직관적이고 세련되게 작성하세요.";

const WEATHER_NEWS_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 출력하세요. 답변은 항상 한글로 작성하세요.\n(출력 형식) 블로그 포스팅처럼 관련 텍스트 아이콘(이모지)을 적극적으로 사용하여 시각적으로 잘 정리된 형식으로 답변하세요.\n(날씨 규칙) '추정'이라는 표현은 삼가고, 현재 날씨는 기상청 등 신뢰할 수 있는 데이터를 기반으로 작성하세요.";

const TRAVEL_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 출력하세요.\n(출력 형식) 블로그 포스팅처럼 관련 텍스트 아이콘(이모지)을 적극적으로 사용하여 시각적으로 잘 정리된 형식으로 답변하세요. 여행 코스, 명소, 맛집 등을 구체적으로 안내해 주세요.";

const ENTERTAINMENT_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 출력하세요.\n(출력 형식) 블로그 포스팅처럼 관련 텍스트 아이콘(이모지)을 적극적으로 사용하여 시각적으로 잘 정리된 형식으로 답변하세요. 최신 정보를 웹에서 검색하여 정확하게 제공해 주세요.";

export const SERVICE_DATA: ServiceCategory[] = [
  {
    id: 'weather_news',
    label: '날씨 뉴스',
    items: [
      { id: 'curr_weather', icon: '🌤️', label: '현재 날씨', prompt: '기본지역 군포 현재 날씨, 온도, 바람, 습도, 체감 온도, 강수율, 초미세먼지, 미세먼지, 오존(O3), 자외선 지수 정보를 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'week_weather', icon: '📅', label: '주간 날씨', prompt: '기본지역 군포 주간 날씨(오전, 오후), 최저온도, 최고온도, 습도, 강수율 정보를 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'hour_weather', icon: '⏰', label: '시간별 날씨', prompt: '기본지역 군포 1시간별 3일간 날씨, 온도, 습도, 바람, 강수율 정보를 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'nat_weather', icon: '🗺️', label: '전국 날씨', prompt: '전국 단기 및 중기 날씨 관련 정보를 상세하게 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'major_news', icon: '📰', label: '주요 뉴스', prompt: "현재 한국의 주요 뉴스를 정치(3), 경제(3), 사회(1), 문화(1), 엔터(1), IT과학(1) 분류하여 ()비율에 맞게 상세하게 전달해 주세요. '비율에 맞추어' 또는 '몇 가지 뉴스' 같은 불필요한 설명 멘트는 생략하고 뉴스 내용만 브리핑 형식으로 출력하세요." + WEATHER_NEWS_INSTRUCTION },
      { id: 'world_news', icon: '🌍', label: '세계 뉴스', prompt: "현재 세계의 주요 뉴스를 세계 정치(3), 경제(3), AI/IT과학(2), 세계 이슈(2) 분류하여 ()비율에 맞게 상세하게 전달해 주세요. 정치 경제는 미국 관련과 빅테크 비중을 높게 잡아주세요. '비율에 맞추어' 등의 설명 멘트는 생략하고 내용만 출력하세요." + WEATHER_NEWS_INSTRUCTION },
    ]
  },
  {
    id: 'cooking',
    label: '요리 배우기',
    items: [
      { id: 'soup_kor', icon: '🍲', label: '한식 탕', prompt: '임의의 한식 탕관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'stew_kor', icon: '🥘', label: '한식 찌개', prompt: '임의의 한식 찌개관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'stir_kor', icon: '🍳', label: '한식 볶음', prompt: '임의의 한식 볶음관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'salad_kor', icon: '🥗', label: '한식 무침', prompt: '임의의 한식 무침관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'japan', icon: '🍣', label: '일식 요리', prompt: '임의의 일식 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'chinese', icon: '🥟', label: '중식 요리', prompt: '임의의 중식 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'french', icon: '🥐', label: '프랑스 요리', prompt: '임의의 프랑스 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'italian', icon: '🍝', label: '이탈리아 요리', prompt: '임의의 이탈리아 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'baguette', icon: '🥖', label: 'Baguette', prompt: '임의의 빵 관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'today', icon: '👨‍🍳', label: '오늘의 요리', prompt: '국적이 다 포함된 임의의 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'healthy', icon: '🥬', label: '건강 요리', prompt: '임의의 건강하고 영양가 있는 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'recommend', icon: '⭐', label: '추천 요리', prompt: '현재 할 수 있는 요리 하나를 레시피 제공 해 주세요.' + COOKING_INSTRUCTION },
    ]
  },
  {
    id: 'health',
    label: '건강 관리',
    items: [
      { id: 'habit', icon: '✨', label: '건강 습관', prompt: '건강 습관 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'diet_food', icon: '🥗', label: '건강 식단', prompt: '건강 식단 임의의 건강하고 영양가 있는 레시피 하나를 임의로 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'exercise', icon: '🏃', label: '건강 운동', prompt: '건강 운동 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'diet', icon: '⚖️', label: '다이어트', prompt: '다이어트 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'obesity', icon: '📊', label: '비만 관리', prompt: '비만 관리 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'dental', icon: '🦷', label: '구강 치아', prompt: '구강과 치아 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'skin', icon: '💆', label: '피부 건강', prompt: '피부 건강 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'joint', icon: '🦴', label: '관절 척추', prompt: '관절과 척추 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'pain', icon: '💊', label: '통증 관리', prompt: '통증 관리 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'env', icon: '🌿', label: '환경 관리', prompt: '평상시 생활 속 환경 위생 관리 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'mental', icon: '🧠', label: '멘탈 강화', prompt: '멘탈 강화 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'immune', icon: '🛡️', label: '면역 강화', prompt: '면역 강화 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
    ]
  },
  {
    id: 'life',
    label: '생활 Tips',
    items: [
      { id: 'laundry', icon: '👕', label: '세탁 의류', prompt: '세탁 의류 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'kitchen', icon: '🍽️', label: '주방 요리', prompt: '주방 요리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'cleaning', icon: '🧹', label: '청소 정리', prompt: '청소 정리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'home', icon: '🏠', label: '집안 관리', prompt: '집안 관리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'lifeitem', icon: '🧴', label: '생활용품', prompt: '생활용품 관리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'travel_go', icon: '✈️', label: '여행 나들이', prompt: '여행 나들이 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'health_ex', icon: '💪', label: '건강 운동', prompt: '건강 운동 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'mental_care', icon: '🧘', label: '멘탈 관리', prompt: '멘탈 관리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'beauty', icon: '💄', label: '뷰티 패션', prompt: '뷰티 패션 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'app', icon: '📱', label: '앱 활용', prompt: '앱 활용 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'safety', icon: '🚨', label: '안전 비상', prompt: '안전 비상 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'camping', icon: '⛺', label: '캠핑 야외', prompt: '캠핑 할때 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
    ]
  },
  {
    id: 'travel_guide',
    label: '여행 가이드',
    items: [
      { id: 'day_trip', icon: '🌅', label: '당일코스', prompt: '지친 일상에서 벗어나 하루 만에 즐길 수 있는 국내 당일 여행 코스들을 소개합니다. 인기 명소와 함께 특별한 경험을 할 수 있는 국내 일정을 추천해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'weekend', icon: '🗓️', label: '주말여행', prompt: '주말 동안 짧고 굵게 떠날 수 있는 국내 여행지 베스트를 소개합니다. 가족, 친구 또는 혼자서도 즐길 수 있는 다양한 국내 주말 여행 코스를 이전과 다르게 안내해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'onenight', icon: '🏕️', label: '1박 2일', prompt: '하룻밤을 넘기며 여유롭게 즐길 수 있는 1박 2일 여행 코스를 소개합니다. 여행지의 매력을 충분히 느낄 수 있도록 알차게 구성된 국내 일정을 이전과 다르게 추천해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'twonight', icon: '🧳', label: '2박 3일', prompt: '더욱 깊이 있는 여행을 원하신다면 2박 3일 여행 코스를 고려해 보세요. 다양한 활동과 새로운 경험을 통해 여행지를 충분히 만끽할 수 있는 일정을 이전과 달리 제공해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'theme', icon: '🎨', label: '테마 여행', prompt: '취미나 관심사에 맞춘 테마 여행 코스를 소개합니다. 예술, 음식, 전시회, 자연 등 다양한 테마별로 특별한 여행지를 추천해드리고 관련 체험 활동도 이전과 다르게 안내주세요' + TRAVEL_INSTRUCTION },
      { id: 'trekking', icon: '🥾', label: '트레킹', prompt: '자연 속에서 힐링할 수 있는 트레킹 코스를 안내합니다. 각 코스의 난이도, 소요 시간별로 최고의 트레킹 명소들을 이전과 다르게 소개해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'overseas', icon: '✈️', label: '해외여행', prompt: '꼭 가봐야 할 해외 여행지를 추천합니다. 시즌별 인기 국가와 바로 떠나기 좋은 해외 명소들을 다양한 요소를 고려하여 이전과 다르게 추천해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'world_attractions', icon: '🗽', label: '세계명소', prompt: '전 세계 국가들에 있는 유명 명소를 이전과 다르게 랜덤하게 5개 선별해서 5줄이상으로 블러그 형식으로 소개 설명 해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'lodging', icon: '🏨', label: '숙박&준비물', prompt: '성공적인 여행을 위해서는 숙박이 중요합니다. 합리적인 가격에 좋은 숙소를 예약할 수 있는 팁이나 여행 시 꼭 챙겨가야 할 준비물 목록과, 여행지에 따라 필요한 추가 준비물을 이전과 다르게 상세히 잊어버리기 쉬운것도 안내해 주세요' + TRAVEL_INSTRUCTION },
      { id: 'attractions', icon: '🏛️', label: '관광 명소', prompt: '국내외 여행지에서 꼭 가봐야 할 관광 명소 리스트를 제공합니다. 다채로운 문화적 경험을 위한 정보를 이전과 다르게 안내해 주세요.' + TRAVEL_INSTRUCTION },
      { id: 'safety_info', icon: '⚠️', label: '안전 정보', prompt: '안전한 여행을 위한 중요 정보를 제공합니다. 여행지별 안전 수칙과 주의사항을 이전과 다르게 상세히 안내해 주세요.' + TRAVEL_INSTRUCTION },
      { id: 'food_travel', icon: '🍜', label: '여행 먹거리', prompt: '여행지에서 꼭 먹어봐야 할 현지 음식을 소개합니다. 특별한 맛과 분위기를 즐길 수 있는 맛집 리스트도 이전다르게 제공 해 주세요' + TRAVEL_INSTRUCTION },
    ]
  },
  {
    id: 'multi_enter',
    label: '멀티 엔터',
    items: [
      { id: 'popular_music', icon: '🎵', label: '최신 인기곡', prompt: '현재 한국 및 글로벌 차트에서 가장 인기 있는 K-POP 및 팝 음악 정보를 알려주세요. 주요 아티스트, 곡명, 그리고 최신 동향을 포함해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'indie_genre', icon: '🎸', label: '인디/장르 음악', prompt: '최근 주목받는 인디 아티스트나 특정 장르(힙합, R&B, 록 등)의 숨겨진 명곡, 또는 추천할 만한 음악을 소개하고 관련 정보를 제공해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'classic_jazz', icon: '🎻', label: '클래식/재즈', prompt: '유명 클래식 작곡가나 재즈 뮤지션, 혹은 다가오는 클래식/재즈 공연 정보와 주요 레퍼토리에 대해 알려주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'drama_series', icon: '📺', label: '드라마/시리즈', prompt: '최신 방영 중이거나 곧 공개될 드라마/시리즈(한국/해외) 정보를 알려주세요. 줄거리, 출연진, 관전 포인트를 포함해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'variety_docu', icon: '🎭', label: '예능/교양', prompt: '현재 인기 있는 TV 예능 프로그램이나, 유익한 다큐멘터리/교양 프로그램 정보를 추천해 주세요. 주요 내용과 시청 포인트를 설명해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'box_office', icon: '🎬', label: '개봉작/박스오피스', prompt: '현재 상영 중인 영화 중 박스오피스 순위가 높은 영화나 최근 개봉작에 대한 정보를 알려주세요. 줄거리, 배우, 감독, 평점을 포함해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'indie_art_film', icon: '🎞️', label: '독립/예술 영화', prompt: '최근 개봉했거나 평론가들에게 호평받는 독립 영화나 예술 영화를 추천하고, 영화가 주는 메시지나 특징에 대해 설명해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'genre_movie', icon: '🍿', label: '장르별 추천 영화', prompt: '특정 장르(예: SF, 로맨스, 스릴러 등)에서 최근 인기 있거나 꼭 봐야 할 명작 영화 3편을 추천하고 간략한 줄거리와 감상 포인트를 알려주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'concert_fanmeet', icon: '🎤', label: '콘서트/팬미팅', prompt: '다가오는 주요 K-POP 콘서트, 해외 아티스트 내한 공연, 또는 인기 아이돌 그룹의 팬미팅 일정과 예매 정보를 알려주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'musical_theater', icon: '🎪', label: '뮤지컬/연극', prompt: '현재 공연 중이거나 곧 개막할 인기 뮤지컬/연극 작품을 추천하고, 시놉시스, 출연진, 예매 정보를 제공해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'podcast', icon: '🎧', label: '인기 팟캐스트', prompt: '최근 청취율이 높거나 화제가 되고 있는 팟캐스트 프로그램을 3개 추천하고, 각 팟캐스트의 주제, 진행자, 주요 에피소드에 대해 설명해 주세요.' + ENTERTAINMENT_INSTRUCTION },
      { id: 'audio_content', icon: '📻', label: '오디오 콘텐츠', prompt: '팟캐스트 외에 오디오북, 오디오 드라마 등 다양한 형태의 추천 오디오 콘텐츠를 소개하고, 접근 가능한 플랫폼 정보를 함께 알려주세요.' + ENTERTAINMENT_INSTRUCTION },
    ]
  },
  {
    id: 'english',
    label: '영어 학습',
    items: [
      { id: 'cafe', icon: '☕', label: 'Cafe', prompt: 'Cafe 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'phone', icon: '📞', label: 'Phone', prompt: 'Phone 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'travel', icon: '🧳', label: 'Travel', prompt: 'Travel 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'work', icon: '💼', label: 'Work', prompt: 'Work 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'hotel', icon: '🏨', label: 'Hotel', prompt: 'Hotel 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'airport', icon: '🛫', label: 'Airport', prompt: 'Airport 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'hospital', icon: '🏥', label: 'Hospital', prompt: 'Hospital 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'restaurant', icon: '🍴', label: 'Restaurant', prompt: 'Restaurant 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'shopping', icon: '🛒', label: 'Shopping', prompt: 'Shopping 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'business', icon: '📈', label: 'Business', prompt: 'Business 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'emergency', icon: '🆘', label: 'Emergency', prompt: 'Emergency 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'street', icon: '🚶', label: 'Street', prompt: 'Street 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'chatter', icon: '💬', label: 'Chatter', prompt: 'Chatter 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'topic', icon: '📝', label: 'Topic', prompt: 'Topic 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'general', icon: '🌐', label: 'General', prompt: 'General 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'beg_word', icon: '🔤', label: '초급 단어', prompt: '초급~중급에 해당하는 영어 단어를 10개씩 보여주며 발음을 주고 번역 해 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'int_word', icon: '📚', label: '중급 단어', prompt: '중급~고급에 해당하는 영어 단어를 10개씩 보여주며 발음을 주고 번역 해 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'adv_word', icon: '🎓', label: '고급 단어', prompt: '고급~전문에 해당하는 영어 단어를 10개씩 보여주며 발음을 주고 번역 해 주세요.' + ENGLISH_INSTRUCTION },
    ]
  },
  {
    id: 'ott_links',
    label: 'OTT 음원',
    items: [
      { id: 'netflix', icon: '🎬', label: 'Netflix', prompt: '', link: 'https://www.netflix.com/' },
      { id: 'coupang_play', icon: '🛒', label: '쿠팡플레이', prompt: '', link: 'https://www.coupangplay.com/' },
      { id: 'wavve', icon: '📺', label: 'Wavve', prompt: '', link: 'https://www.wavve.com/' },
      { id: 'tving', icon: '📱', label: 'TVING', prompt: '', link: 'https://www.tving.com/' },
      { id: 'disney_plus', icon: '🏰', label: 'Disney+', prompt: '', link: 'https://www.disneyplus.com/' },
      { id: 'melon', icon: '🍈', label: 'Melon', prompt: '', link: 'https://www.melon.com/' },
      { id: 'genie', icon: '🧞', label: '지니뮤직', prompt: '', link: 'https://www.genie.co.kr/' },
      { id: 'spotify', icon: '💚', label: 'Spotify', prompt: '', link: 'https://www.spotify.com/' },
      { id: 'youtube_music', icon: '🎵', label: 'YouTube Music', prompt: '', link: 'https://music.youtube.com/' },
      { id: 'youtube', icon: '▶️', label: 'YouTube', prompt: '', link: 'https://www.youtube.com/' },
      { id: 'naver_tv', icon: '🟢', label: '네이버TV', prompt: '', link: 'https://tv.naver.com/' },
      { id: 'kakao_tv', icon: '💬', label: '카카오TV', prompt: '', link: 'https://tv.kakao.com/' },
    ]
  }
];
