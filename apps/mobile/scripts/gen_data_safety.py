# Play 데이터 보안 CSV 만들기 (2026-11-08) — 사용: python scripts/gen_data_safety.py store/android/data_safety_template.csv store/android/data_safety.csv
# 틀 = Console "CSV 파일로 내보내기" 파일. 올리기 = python scripts/play_upload.py datasafety
import csv, sys
src, dst = sys.argv[1], sys.argv[2]
rows = list(csv.reader(open(src, encoding='utf-8')))
ACCOUNT = {'PSL_NAME','PSL_EMAIL','PSL_USER_ACCOUNT','PSL_PHONE','PSL_OTHER_PERSONAL'}
TYPES = ACCOUNT | {'PSL_HEALTH','PSL_FITNESS','PSL_PHOTOS','PSL_VIDEOS','PSL_FILES_AND_DOCS','PSL_OTHER_MESSAGES','PSL_USER_GENERATED_CONTENT'}
FIXED = {
  ('PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA',''): 'true',
  ('PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT',''): 'true',
  ('PSL_SUPPORTED_ACCOUNT_CREATION_METHODS','PSL_ACM_USER_ID_PASSWORD'): 'true',
  ('PSL_SUPPORTED_ACCOUNT_CREATION_METHODS','PSL_ACM_OAUTH'): 'true',
  ('PSL_ACCOUNT_DELETION_URL',''): 'https://vitacodeapp.com/account-delete/',
  ('PSL_SUPPORT_DATA_DELETION_BY_USER','DATA_DELETION_NO'): 'true',
}
out = [rows[0]]
for r in rows[1:]:
    q, rid = r[0], r[1]
    v = ''
    if (q, rid) in FIXED: v = FIXED[(q, rid)]
    elif q.startswith('PSL_DATA_TYPES_'): v = 'true' if rid in TYPES else ''
    elif q.startswith('PSL_DATA_USAGE_RESPONSES:'):
        _, t, sub = q.split(':')
        if t in TYPES:
            if sub == 'PSL_DATA_USAGE_COLLECTION_AND_SHARING' and rid == 'PSL_DATA_USAGE_ONLY_COLLECTED': v = 'true'
            elif sub == 'PSL_DATA_USAGE_EPHEMERAL': v = 'false'
            elif sub == 'DATA_USAGE_USER_CONTROL' and rid == 'PSL_DATA_USAGE_USER_CONTROL_REQUIRED': v = 'true'
            elif sub == 'DATA_USAGE_COLLECTION_PURPOSE' and (rid == 'PSL_APP_FUNCTIONALITY' or (rid == 'PSL_ACCOUNT_MANAGEMENT' and t in ACCOUNT)): v = 'true'
    out.append([q, rid, v] + r[3:])
csv.writer(open(dst, 'w', encoding='utf-8', newline='')).writerows(out)
print(sum(1 for r in out[1:] if r[2]), 'answers')
