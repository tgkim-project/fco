import { Link } from 'react-router-dom'

// 내용 출처: https://openapi.nexon.com/ko/guide/prepare-in-advance/ , /ko/guide/request-api/ , /ko/support/terms/
// (2026-11-23 확인). 사이트 메뉴가 바뀌면 이 화면도 함께 갱신해야 한다.
const OPENAPI_URL = 'https://openapi.nexon.com/ko/'
const CREATE_APP_URL = 'https://openapi.nexon.com/ko/my-application/create-app/'

export default function GuidePage() {
  return (
    <section className="page guide">
      <h1>API 키 발급 가이드</h1>
      <p className="muted">
        전적 검색은 넥슨이 제공하는 NEXON Open API를 사용합니다. 아래 순서대로 내 API 키를 발급받아 앱에
        등록하세요. 처음 한 번만 하면 됩니다.
      </p>

      <ol className="steps">
        <li>
          <strong>NEXON Open API 사이트에 로그인</strong>
          <p>
            <a href={OPENAPI_URL} target="_blank" rel="noreferrer">
              openapi.nexon.com
            </a>
            에 접속해 오른쪽 위 <b>로그인</b>을 눌러 넥슨 ID로 로그인합니다. 넥슨 ID가 없으면 <b>회원가입</b>
            부터 합니다.
          </p>
        </li>
        <li>
          <strong>애플리케이션 등록</strong>
          <p>
            상단 메뉴 <b>내 애플리케이션 → 애플리케이션 등록</b>으로 이동합니다. (
            <a href={CREATE_APP_URL} target="_blank" rel="noreferrer">
              바로 가기
            </a>
            )
          </p>
        </li>
        <li>
          <strong>게임과 타입 선택</strong>
          <ul>
            <li>
              <b>게임 선택</b>: <b>FC 온라인</b>을 고릅니다. 다른 게임을 고르면 이 앱에서 쓸 수 없습니다.
            </li>
            <li>
              <b>애플리케이션 타입</b>: 개인적으로 쓰는 용도라면 <b>개발 단계</b>를 고릅니다. 서비스명만 입력하면
              됩니다. (예: 내 전적 보기)
            </li>
          </ul>
        </li>
        <li>
          <strong>약관 동의 후 등록</strong>
          <p>이용 약관에 동의하고 등록하면 API 키가 바로 발급됩니다. 별도 승인 절차는 없습니다.</p>
        </li>
        <li>
          <strong>API 키 복사</strong>
          <p>
            <b>내 애플리케이션 → 애플리케이션 목록</b>에서 방금 만든 애플리케이션을 눌러 상세 페이지로 들어가면
            API 키가 보입니다. 키 전체를 복사합니다.
          </p>
        </li>
        <li>
          <strong>앱에 붙여넣기</strong>
          <p>
            이 앱의 <Link to="/settings">설정</Link> 화면에 붙여넣고 <b>확인 후 저장</b>을 누르면 키가 맞는지 바로
            확인합니다.
          </p>
        </li>
      </ol>

      <h2>자주 묻는 질문</h2>
      <dl className="faq">
        <dt>내 키는 어디에 저장되나요?</dt>
        <dd>
          이 기기 안에만 저장됩니다. 이 앱은 서버가 없어서 키를 다른 곳으로 보내지 않고, NEXON Open API를 호출할
          때만 사용합니다. <Link to="/settings">설정</Link>에서 언제든 삭제할 수 있습니다.
        </dd>

        <dt>키를 다른 사람과 같이 써도 되나요?</dt>
        <dd>
          안 됩니다. NEXON Open API 이용 약관상 API 키는 다른 사람에게 제공하거나 공유할 수 없습니다. 각자 발급받아
          사용하세요.
        </dd>

        <dt>몇 번까지 조회할 수 있나요?</dt>
        <dd>
          개발 단계 키는 <b>초당 5건, 하루 1,000건</b>까지 호출할 수 있습니다. 한도를 넘으면 잠시 후 다시
          시도하라는 안내가 나옵니다.
        </dd>

        <dt>"API 키가 올바르지 않습니다"라고 나와요.</dt>
        <dd>
          키 일부만 복사했거나 앞뒤에 다른 글자가 붙었을 수 있습니다. 상세 페이지에서 키 전체를 다시 복사해
          주세요.
        </dd>

        <dt>"조회할 권한이 없습니다"라고 나와요.</dt>
        <dd>애플리케이션을 등록할 때 게임을 "FC 온라인"으로 골랐는지 확인하고, 아니라면 새로 등록하세요.</dd>

        <dt>키가 유출됐거나 바꾸고 싶어요.</dt>
        <dd>
          애플리케이션 상세 페이지에서 키를 추가로 발급받을 수 있습니다(애플리케이션당 최대 2개). 새 키를 설정에
          다시 등록하세요.
        </dd>

        <dt>키가 갑자기 안 돼요.</dt>
        <dd>발급받은 키를 1년 동안 사용하지 않으면 넥슨이 사전 안내 후 삭제할 수 있습니다. 이 경우 새로 발급받으세요.</dd>

        <dt>방금 한 경기가 안 보여요.</dt>
        <dd>NEXON Open API 데이터는 매시 정각에 두 시간 전까지의 경기가 반영됩니다.</dd>
      </dl>

      <p className="muted small">Data based on NEXON Open API · 넥슨과 무관한 비공식 앱입니다.</p>
    </section>
  )
}
