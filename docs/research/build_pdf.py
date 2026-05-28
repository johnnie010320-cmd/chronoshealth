# -*- coding: utf-8 -*-
"""
Chronos Health 경쟁사 리서치 PDF 빌더 (2026-05-15)
한글 폰트: Malgun Gothic (Windows 기본)
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

# ---- 한글 폰트 등록 ----
pdfmetrics.registerFont(TTFont('Malgun', 'C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBd', 'C:/Windows/Fonts/malgunbd.ttf'))

# ---- 스타일 ----
styles = getSampleStyleSheet()
BASE = 'Malgun'
BOLD = 'MalgunBd'

style_title = ParagraphStyle(
    'Title', fontName=BOLD, fontSize=18, leading=24,
    textColor=colors.HexColor('#1A237E'), spaceAfter=4*mm, alignment=0,
)
style_subtitle = ParagraphStyle(
    'Subtitle', fontName=BASE, fontSize=10, leading=14,
    textColor=colors.HexColor('#666666'), spaceAfter=8*mm,
)
style_h1 = ParagraphStyle(
    'H1', fontName=BOLD, fontSize=14, leading=20,
    textColor=colors.HexColor('#1A237E'), spaceBefore=6*mm, spaceAfter=3*mm,
)
style_h2 = ParagraphStyle(
    'H2', fontName=BOLD, fontSize=11.5, leading=16,
    textColor=colors.HexColor('#333333'), spaceBefore=4*mm, spaceAfter=2*mm,
)
style_body = ParagraphStyle(
    'Body', fontName=BASE, fontSize=9.5, leading=14,
    textColor=colors.HexColor('#222222'), spaceAfter=2*mm,
)
style_body_small = ParagraphStyle(
    'BodySmall', fontName=BASE, fontSize=8.5, leading=12,
    textColor=colors.HexColor('#222222'),
)
style_cell = ParagraphStyle(
    'Cell', fontName=BASE, fontSize=8, leading=11,
    textColor=colors.HexColor('#222222'),
)
style_cell_head = ParagraphStyle(
    'CellHead', fontName=BOLD, fontSize=8.5, leading=12,
    textColor=colors.white, alignment=1,
)
style_note = ParagraphStyle(
    'Note', fontName=BASE, fontSize=8.5, leading=12,
    textColor=colors.HexColor('#555555'), spaceBefore=2*mm, spaceAfter=4*mm,
    leftIndent=4*mm, borderPadding=2,
)
style_callout = ParagraphStyle(
    'Callout', fontName=BOLD, fontSize=10, leading=14,
    textColor=colors.HexColor('#C62828'), spaceBefore=3*mm, spaceAfter=2*mm,
)

def P(text, st=style_body):
    return Paragraph(text, st)

def make_table(headers, rows, col_widths):
    data = [[Paragraph(h, style_cell_head) for h in headers]]
    for row in rows:
        data.append([Paragraph(c, style_cell) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A237E')),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#BBBBBB')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),
         [colors.white, colors.HexColor('#F5F6FA')]),
    ]))
    return t

# ---- 문서 구성 ----
doc = SimpleDocTemplate(
    'C:/Users/User/Desktop/Johnnie/Chronos/docs/research/chronos-competitor-research-2026-05-15.pdf',
    pagesize=A4,
    leftMargin=15*mm, rightMargin=15*mm,
    topMargin=15*mm, bottomMargin=15*mm,
    title='Chronos Health 경쟁사 리서치',
    author='Chronos Health',
)

story = []

# === 표지 ===
story.append(P('Chronos Health — 경쟁사 리서치 보고서', style_title))
story.append(P('AI 헬스 예측 + Health-to-Earn 토큰 ($CHRO) 생태계 · 미국 / 한국 / 일본 시장 비교 · 2026-05-15', style_subtitle))

story.append(P('요약 (Executive Summary)', style_h1))
story.append(P(
    '미국·한국·일본 3개 시장 모두 (1) 생체나이/수명 예측, (2) AI 헬스 슈퍼앱, '
    '(3) Health-to-Earn 토큰, (4) 유전체 노화 검사, (5) 디지털 트윈 등 카테고리별 '
    '플레이어는 존재하나, 5개 모두를 통합한 사업자는 없음. Chronos Health의 '
    'white space는 “웨어러블 연속 + EHR + 유전체 + 생체나이/사망 예측 + ZK 기반 '
    '$CHRO 토큰 보상”의 단일 스택.',
    style_body,
))
story.append(P(
    '최우선 견제 대상 (Top 3): '
    '🇺🇸 Death Clock (mortality SEO 선점, 1M+ DL) · '
    '🇰🇷 SNUH×네이버 생체나이·사망 예측 AI (연구 단계, 상용화 전 선점 필요) · '
    '🇯🇵 HEALTHREE (Web3 헬스 일본 선점, Polkadot/Astar).',
    style_callout,
))

# === 1. 미국 ===
story.append(P('1. 미국 — 가장 성숙한 경쟁 환경', style_h1))

story.append(P('1-1. 생체나이 / 수명 예측', style_h2))
story.append(make_table(
    ['App', '회사/설립', '내용', '차별점', 'Chronos 갭'],
    [
        ['TruDiagnostic TruAge', 'TruDiagnostic / 2020', 'DNA 메틸레이션 950k+ 마커, 1,700+ EBP', '디스크 키트, 62% 정확도 우위', '연속 웨어러블 + ZK 토큰 없음'],
        ['Elysium Index', 'Elysium Health / 2014', '타액 후성유전 9 시스템 스코어', 'David Sinclair 자문', '분기별 우편 검사, 앱 UX 부재'],
        ['InsideTracker', 'Segterra / 2009', '혈액 + 웨어러블 InnerAge', 'Sinclair 투자 + 미국 유통망', '채혈 필수, 모바일 약함'],
        ['Humanity', 'Humanity Inc. / 2020', '웨어러블 기반 Rate of Aging', '랩 없는 SW 전용', '가장 직접 경쟁 — Chronos는 토큰·사망 예측으로 차별화'],
        ['SuperAge', 'SuperAge / 2024', 'PDF 검진 업로드 PhenoAge/KDM', 'DIY 임상 데이터 활용', '데이터 표시만, 유전체·토큰 없음'],
        ['Death Clock', 'Life Lab / 2024', 'AI 사망 예측, CDC 액추어리얼', '"Mortality" SEO 선점, 1M+ DL', '가장 직접 경쟁 — Chronos는 연속·ZK·토큰'],
        ['NuraLogix Longevity Mirror', 'NuraLogix / 2026 Q1', '30초 셀카 → 20년 위험 예측', 'CES 2026 데뷔, 무접촉', '하드웨어 종속, Chronos는 SW-only'],
    ],
    [32*mm, 28*mm, 40*mm, 32*mm, 38*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('1-2. AI 헬스 예측 / 리스크 스코어', style_h2))
story.append(make_table(
    ['App', '설립', '기능', 'Chronos 관계'],
    [
        ['WHOOP 2026 플랫폼', '2012', 'AI Health Coach + 임상의 액세스 (2026.05)', '하드웨어 해자 vs Chronos는 longevity 특화 + 토큰'],
        ['Welltory', '2015', 'HRV + GPT AI Coach', '스트레스 중심, Chronos는 수명 프레임'],
        ['Levels', '2019', 'CGM 대사 스코어', 'Chronos가 하나의 입력 신호로 통합 가능'],
        ['Hume Band', '2025', 'Metabolic Momentum 웨어러블', '신규 하드웨어, Chronos는 cross-device'],
        ['Twin Health', '2018', 'AI 디지털 트윈 (당뇨 역전)', 'B2B2C 보험·고용주 vs Chronos는 D2C + Web3'],
    ],
    [38*mm, 18*mm, 60*mm, 54*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('1-3. Health-to-Earn / Web3 헬스 토큰', style_h2))
story.append(make_table(
    ['프로젝트', '체인 / 설립', '메커니즘', 'Chronos 관계'],
    [
        ['Sweatcoin / SWEAT', 'NEAR+ETH / 2016', '걸음 → 토큰', '걸음만, 의료 데이터 없음'],
        ['STEPN', 'Solana / 2021', 'NFT 신발 + 달리기', 'GameFi 쇠퇴, NFT 게이트'],
        ['Genopets', 'Solana / 2021', 'M2E Tamagotchi + AR', '게임 우선, 임상 부재'],
        ['DEFIT', 'Polygon + ETH / 2021', 'HR 검증 운동 보상 (Strava 연동)', '체인·타겟 동일 — 가장 근접, ZK 없음'],
        ['HealthBlocks', '2022 / NL-US', '블록체인 헬스데이터 저장 + 보상', '사상적 가장 근접, 생체나이 모델 없음'],
    ],
    [38*mm, 28*mm, 56*mm, 48*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('1-4. 디지털 트윈 헬스 플랫폼', style_h2))
story.append(make_table(
    ['플랫폼', '설립', '접근', 'Chronos 관계'],
    [
        ['Q.Bio (Q Bio)', '2015 (Redwood City)', '전신 MRI + Gemini 트윈', '$3k+ 임상, Chronos는 모바일'],
        ['Twin Health', '2018', '대사 트윈 (당뇨)', 'B2B2C 단일 질환'],
        ['NuraLogix', '2015 / Canada-US', '얼굴 이미징 트윈', '하드웨어 종속'],
        ['Forward Health (CarePods)', '2016', 'AI 물리 클리닉 트윈', '자본 집약, Chronos는 asset-light'],
    ],
    [42*mm, 28*mm, 50*mm, 50*mm],
))

story.append(PageBreak())

# === 2. 한국 ===
story.append(P('2. 한국 — 통합 사업자 부재, 핵심 White Space', style_h1))

story.append(P('2-1. 생체나이 / 사망 예측 (Direct Competitors)', style_h2))
story.append(make_table(
    ['서비스', '회사 / 설립', '내용', 'Chronos 차별점'],
    [
        ['BIO-AGE System', '한국 생체나이의학연구소 / 2003', '40만 건 임상 기반 생체나이 (검진센터 내장)', '데이터셋 강함, 그러나 모바일·웨어러블 부재'],
        ['SNUH×네이버 생체나이·사망 예측 AI', '서울대병원 + 네이버 (연구) / 2025', '15만 건 검진 + 질병/사망 라벨 학습', '가장 직접 경쟁 — 상용 앱·토큰·트윈 없음'],
        ['바이오에이지 (bio-age.co.kr)', '바이오에이지 / 2000년대 초', '노화도 + 생활습관 분석', 'B2B 검진센터, consumer UX 없음'],
        ['Ms. Yvonne', '스타트업', '얼굴 사진 노화 시뮬레이션', '엔터테인먼트, 임상 데이터 없음'],
    ],
    [42*mm, 38*mm, 50*mm, 40*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('2-2. AI 헬스케어 슈퍼앱', style_h2))
story.append(make_table(
    ['App', '회사 / 설립', '내용', 'Chronos 관계'],
    [
        ['삼성헬스 / Galaxy Watch', '삼성전자 / 2012', 'MAU 1,021만, Energy Score, 식약처 1호', '거대 풀, longevity·사망 예측 부재'],
        ['PASTA (파스타)', '카카오헬스케어 / 2024', 'CGM + 혈당·체중·혈압 만성질환 케어', '예측·노화 없음, 파트너 가능'],
        ['닥터나우', '닥터나우 / 2019', '비대면 진료 1위', '진료 매칭, 예측 비중첩 — 파트너'],
        ['휴이노 MEMO Patch', '휴이노 / 2014', '14일 ECG + JHU 협업 악화 예측', '심전도 특화, Chronos는 전신 longevity'],
        ['셀바스AI', '셀바스AI / 1999', '체성분·혈압계 + 음성 AI', 'B2B, 비충돌'],
    ],
    [38*mm, 30*mm, 56*mm, 46*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('2-3. Health-to-Earn / 워크앤어너 (Web3)', style_h2))
story.append(make_table(
    ['App', '회사', '메커니즘', 'Chronos 차별점'],
    [
        ['캐시워크', '넛지헬스케어', '만보기 리워드 (1만보=100캐시≈70원), 매출 790억', 'Web2, 의료 데이터 없음'],
        ['MEDIBLOC MediPass + MED 토큰', '메디블록', 'PHR + 걸음 보상, Panacea 메인넷', '가장 유사한 Web3 헬스, 예측·노화 AI 없음'],
        ['SuperWalk ($WALK/$GRND)', '슈퍼워크', 'M2E + NFT 신발, 누적 45만 유저, 빗썸 상장', '게이미피케이션, 임상 미결합'],
        ['Snkrz, THE POL, COQUIZ', '각사', 'Web3 워크앤어너', '동일 카테고리, longevity 미진입'],
    ],
    [42*mm, 28*mm, 56*mm, 44*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('2-4. 유전체 / 혈액 노화 검사', style_h2))
story.append(make_table(
    ['서비스', '회사 / 설립', '내용', 'Chronos 차별점'],
    [
        ['젠톡 (GenTok)', '마크로젠 / 1997', 'DTC 73종 유전자 검사 (노화 항목 포함)', '1회성, Chronos는 종단 + 웨어러블 통합'],
        ['GC지놈 헬스체크업', 'GC지놈', '유전자 + 마이크로바이옴 검진', 'B2B2C 검진센터, 동적 예측 부재'],
        ['클리노믹스', '클리노믹스 / 2000', '액체생검·다중오믹스 암/노화', '진단 깊이 강점, 일상 추적 없음'],
        ['테라젠바이오 Epigenome Seq', '테라젠바이오', 'DNA 메틸레이션 후성유전 노화', '연구·B2B, consumer-grade 부재'],
    ],
    [40*mm, 28*mm, 54*mm, 48*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('2-5. 디지털 트윈 / 예측 의료', style_h2))
story.append(P(
    '· <b>메디리타 (Medirita)</b>: AI 신약·환자 시뮬레이션, B2B 제약 중심. 직접 경쟁 없음, 기술 협력 가능.<br/>'
    '· <b>셀바스AI MediVoice</b>: 의료 음성 AI, 트윈 아님.<br/>'
    '· 한국 시장에 <b>consumer-facing 디지털 트윈 longevity 앱은 부재</b> → '
    'Chronos의 가장 큰 white space.',
    style_body,
))

story.append(PageBreak())

# === 3. 일본 ===
story.append(P('3. 일본 — 분절된 시장, Web3 경쟁 존재', style_h1))

story.append(P('3-1. 생체나이 / 노화 예측', style_h2))
story.append(make_table(
    ['서비스', '회사 / 설립', '내용', 'Chronos 차별점'],
    [
        ['エピクロック® (EpiClock)', 'Rhelixa / 2015', 'DNA 메틸레이션 2세대 클럭, 생체나이+20지표', '연 1회 혈액 스냅샷, Chronos는 연속 스트림'],
        ['バイオデジタルツイン (BDT)', 'NTT / 2020', '심신 디지털 사상으로 미래 예측', 'B2B 연구 단계, consumer 아님'],
        ['얼굴 사진 AI 연령 판정', '각사 연구단계', '얼굴 → 생체나이 추정', '간편하나 정밀도 불안정'],
    ],
    [42*mm, 28*mm, 56*mm, 44*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('3-2. AI 건강 예측 / 질병 리스크', style_h2))
story.append(make_table(
    ['App', '회사 / 설립', '내용', 'Chronos 차별점'],
    [
        ['カロママ プラス × 東芝', '링크앤커뮤니케이션 + 도시바 / 2024 연계', '건진 → 5질환 5년 발병 리스크 AI', 'B2B2C 단발 입력, Chronos는 연속·유전체'],
        ['Karute-ko (카르테코)', 'Medical Data Vision / 2024', '건진 → 34질환 3년 리스크 ¥550/월', 'B2C, mortality 미제공'],
        ['AI 疾病予測', 'NEC 솔루션이노베이터 / 2024', '4년 생활습관병 AI', 'B2B 자치체·건보, consumer 아님'],
        ['メルプ (Melp)', 'flixy (JMDC) / 2017', 'AI 受診相談 1000+ 병명', '진료 매칭, 예측 비중첩'],
        ['MiRMes', 'Mirai Lab', 'miRNA 기반 암 리스크 키트', '단일 질환, longevity 부재'],
    ],
    [38*mm, 32*mm, 50*mm, 50*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('3-3. Health-to-Earn / Move-to-Earn', style_h2))
story.append(make_table(
    ['App', '회사 / 일본 진출', '메커니즘', 'Chronos 차별점'],
    [
        ['HEALTHREE (ヘルスリー)', 'HEALTHREE Pte. (SG) / 2023 alpha', '걸음 + 수면 + 식사 로그 → UHT/GHT (Polkadot/Astar)', '가장 직접 Web3 경쟁, 임상 데이터 부재, Polygon EVM 우위'],
        ['Sweatcoin / SWEAT', 'Sweat Economy / 2022.04', '걸음 → SWEAT (NEAR)', '의료 결합 없음'],
        ['Aglet', 'Aglet Inc.', '스니커즈 NFT × 걸음', '게임형, 임상 부재'],
    ],
    [42*mm, 30*mm, 58*mm, 40*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('3-4. 유전체 기반 노화 검사', style_h2))
story.append(make_table(
    ['서비스', '회사 / 설립', '내용', 'Chronos 차별점'],
    [
        ['GeneLife Genesis 2.0', 'Genesis Healthcare / 2007', '360–409 항목, 장수·피부노화 포함', 'SNP 정적 리포트'],
        ['MYCODE', 'DeNA 라이프사이언스 / 2014', '약 280항목 헬스케어 키트', '동일 — 정적'],
        ['ユーグレナ・マイヘルス → GeneQuest 통합', '유글레나 / 진퀘스트 / 2018', '300+ 항목 (2026.04.30 사이트 종료)', '시장 통합 진행 중, 동적 업데이트 없음'],
        ['Awakens / Genequest', '진퀘스트 / 2013', '전 게놈 리포트', '연구 + B2C, 앱 기능 빈약'],
    ],
    [40*mm, 32*mm, 50*mm, 48*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('3-5. 디지털 트윈 / 예방 의료', style_h2))
story.append(make_table(
    ['App', '회사', '내용', 'Chronos 차별점'],
    [
        ['Ubie', 'Ubie / 2017', 'AI 증상 검색·문진 (시리즈C 35억엔)', 'Triage, 예측 부재'],
        ['Linc\'well', 'Linc\'well / 2018', '클리닉 DX (CLINIC FOR 운영)', '클리닉 운영, 예측 약함'],
        ['NTT 바이오디지털 트윈', 'NTT / 2020', '심신 디지털 사상 미래 시뮬', 'B2B 연구, consumer 공백'],
    ],
    [38*mm, 30*mm, 56*mm, 46*mm],
))

story.append(PageBreak())

# === 4. 종합 분석 ===
story.append(P('4. Chronos 차별화 종합 — 3개 시장 공통 White Space', style_h1))
story.append(P(
    '전 세계 어느 시장에도 다음 5개를 모두 결합한 사업자는 <b>존재하지 않음</b>:',
    style_body,
))
story.append(make_table(
    ['#', '결합 요소', 'Chronos 접근', '시장 현황'],
    [
        ['1', '웨어러블 연속 데이터', 'Apple Watch / Galaxy Watch / Fitbit 다중 연동', '대부분 메틸레이션 키트 1회성'],
        ['2', '생체나이 + 다질병 + 사망시점 통합 스코어', '$CHRO 보상과 결합된 longevity dashboard', '단일 지표 또는 단일 질환 위주'],
        ['3', 'EHR + 유전체 동적 통합', '검진 업로드 + DTC 유전체 종단 분석', '정적 SNP 리포트가 대부분'],
        ['4', 'Polygon 기반 $CHRO 토큰', 'EVM 호환 + DeFi 유동성', 'Sweatcoin·HEALTHREE 등 걸음 보상 위주'],
        ['5', 'ZK 증명 데이터 주권', '의료 데이터 기여 → ZK proof 보상', 'HealthBlocks 등 일부만 시도'],
    ],
    [10*mm, 38*mm, 60*mm, 60*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('가장 빠르게 좁혀야 할 3개 경쟁자', style_h2))
story.append(make_table(
    ['시장', '경쟁자', '위협 포인트', '대응 전략'],
    [
        ['🇺🇸 미국', 'Death Clock', '"Mortality" SEO·앱스토어 선점, 1M+ DL', '"Mortality + Web3 보상" 메시지로 재포지셔닝'],
        ['🇰🇷 한국', 'SNUH×네이버 AI', '상용화 전 시장 선점이 관건', 'UX·토큰·MVP 우선, CertiK 감사 가속'],
        ['🇯🇵 일본', 'HEALTHREE', 'Web3 헬스 일본 선점 (Polkadot/Astar)', 'Polygon EVM 호환성으로 DeFi 유동성 우위 부각'],
    ],
    [18*mm, 30*mm, 60*mm, 60*mm],
))

story.append(Spacer(1, 4*mm))
story.append(P('파트너십 후보 (시장별)', style_h2))
story.append(P(
    '· <b>🇺🇸 미국</b>: WHOOP (웨어러블 입력), InsideTracker (혈액 검사 데이터)<br/>'
    '· <b>🇰🇷 한국</b>: 마크로젠·GC지놈 (유전체 입력), 카카오헬스케어 PASTA (만성질환 연계), 닥터나우 (중재 액션)<br/>'
    '· <b>🇯🇵 일본</b>: Rhelixa (EpiClock 바이오마커 입력), GeneQuest (유전체), Coincheck / bitFlyer (CHRO 상장)',
    style_body,
))

story.append(Spacer(1, 6*mm))
story.append(P('5. 우선 행동 제안 (요청 시 진행)', style_h1))
story.append(P(
    '1. 위 3개 경쟁자(Death Clock / SNUH-네이버 / HEALTHREE) deep-dive: 가격·UX·약점 분석 → Chronos 포지셔닝 메시지 도출<br/>'
    '2. 한국 white space 기반 GTM 우선순위 재검토 (LBank 상장 전 마케팅 카피 작성)<br/>'
    '3. 파트너십 outreach 리스트 작성 (Rhelixa, 마크로젠, GC지놈, 카카오헬스케어 PASTA)<br/>'
    '4. CertiK 감사 대비 — Polygon 컨트랙트 + ZK proof 회로 사전 정합성 검토',
    style_body,
))

# === 부록: Sources ===
story.append(PageBreak())
story.append(P('부록. 출처 (Sources)', style_h1))
story.append(P('🇺🇸 미국 시장', style_h2))
us_sources = [
    'Best Biological Age Tests 2026 — mindbodygreen',
    'TruDiagnostic TruAge — trudiagnostic.com',
    'Humanity — humanity.health',
    'SuperAge — App Store',
    'Death Clock launches AI health concierge — Longevity.Technology',
    'GlycanAge raises €7.4M — EU-Startups',
    'Hume Band 2026 Consumer Report — Yahoo Finance',
    'WHOOP on-demand clinician access — CNBC 2026-05-08',
    'NuraLogix Longevity Mirror CES 2026 — BigGo',
    'Twin Health Review 2026 — ToolDirectory',
    'Q Bio digital twin platform — DOTmed',
    'Top Move-to-Earn 2026 — 99Bitcoins / Idea Usher',
    'HealthBlocks — healthblocks.ai',
    'ZK proofs in wearable health — Nature Sci Reports',
    'Healthcare Digital Twins Market 2026 — Precedence Research',
]
for s in us_sources:
    story.append(P('· ' + s, style_body_small))

story.append(Spacer(1, 4*mm))
story.append(P('🇰🇷 한국 시장', style_h2))
kr_sources = [
    '서울대병원·네이버 생체나이/사망 예측 AI — 더메디컬',
    '2026 헬스 트렌드 — 건강지능(HQ) 시대 — Korea Daily Times',
    'BIO-AGE 생체나이 측정 시스템 — MD Today',
    '카카오헬스케어 파스타 PASTA 공식',
    '삼성헬스 MAU 1000만 돌파 — 전자신문',
    '삼성헬스 디지털의료·건강지원기기 1호 — Samsung News',
    '휴이노 × 존스홉킨스 환자 악화 예측 AI — 와우테일',
    '닥터나우 — App Store',
    '캐시워크 — 넛지헬스케어 (App Store)',
    '메디블록 Walk-to-Earn / MED 토큰 — 메디게이트뉴스',
    'SuperWalk GRND 빗썸 상장 — IT Times',
    '마크로젠 젠톡 출시',
    'GC지놈 헬스체크업',
    '테라젠바이오 Epigenome Sequencing',
]
for s in kr_sources:
    story.append(P('· ' + s, style_body_small))

story.append(Spacer(1, 4*mm))
story.append(P('🇯🇵 일본 시장', style_h2))
jp_sources = [
    'エピクロック®公式 (epiclock.jp)',
    'Rhelixa プレスリリース (日本初EpiClock)',
    '日経 — AIが顔写真から生物学的年齢判定',
    '日経ビジネス — MDV/住友生命 がん・脳卒中AI予測',
    '東芝 疾病リスク予測AI',
    'カロママ プラス × 東芝AI連携',
    'NEC 4年以内生活習慣病AIモデル',
    'JMDC メルプ AI受診相談',
    'HEALTHREE 解説 (Diamond / BlockchainGame)',
    'Sweatcoin Japan (Coincheck / CryptoNews JP)',
    'GeneLife / Genesis Healthcare 公式',
    'GeneLife vs MYCODE 比較',
    'ユーグレナ・マイヘルス (GeneQuest移行)',
    'NTT バイオデジタルツイン',
    "Linc'well 公式 / Ubie シリーズC 35億調達",
    'Wellness総研 — 老化時計レポート',
]
for s in jp_sources:
    story.append(P('· ' + s, style_body_small))

story.append(Spacer(1, 6*mm))
story.append(P(
    '— 본 문서는 2026-05-15 기준 웹 리서치(WebSearch) 결과를 종합한 1차 자료입니다. '
    '경쟁자 deep-dive·가격 비교·법무 검토 단계에서는 각 사 공식 IR/약관 재확인이 필요합니다.',
    style_note,
))

doc.build(story)
print('PDF 생성 완료: docs/research/chronos-competitor-research-2026-05-15.pdf')
