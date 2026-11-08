"""VITAcode Android AAB → Google Play 트랙 업로드 (Vita Labs Co., Ltd. 개발자 계정).
  사용: python scripts/play_upload.py <aab> <track>      # track = internal | alpha | beta | production
  - 서비스 계정 play-publisher@veridash-498820 (Vita Labs 계정에 Admin 으로 초대됨, 2026-10-31).
  - 한 번도 출시하지 않은 앱은 API 로 '초안' 릴리스만 만들 수 있다 → 그때는 draft 로 올리고
    Play Console 에서 '출시 시작' 을 한 번 누른다 (소나기 scripts/play_upload.py 와 같은 방식).
  - 빌드는 scripts/build-android.sh 로만 (dist/vitacode-<버전명>+<코드>.aab).
"""
import json, pathlib, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

sys.stdout.reconfigure(encoding="utf-8")
PKG = "com.vitacode.app"
SA = r"C:\Users\User\.veridash-secrets\veridash-play-publisher.json"
NOTES = {
    "ko-KR": "내 VITAcode 결과를 카카오톡·인스타그램 등으로 공유할 수 있습니다. 결과 그림과 앱 받기 링크가 함께 전달됩니다.",
    "en-US": "Share your VITAcode result to messengers and social apps, with a result image and an app download link.",
}

if len(sys.argv) != 3 or sys.argv[2] not in ("internal", "alpha", "beta", "production"):
    sys.exit("사용: python scripts/play_upload.py <aab> <internal|alpha|beta|production>")
aab, track = sys.argv[1], sys.argv[2]
if not pathlib.Path(aab).is_file():
    sys.exit(f"AAB 없음: {aab}")

cred = service_account.Credentials.from_service_account_file(SA, scopes=["https://www.googleapis.com/auth/androidpublisher"])
ed = build("androidpublisher", "v3", credentials=cred, cache_discovery=False).edits()
try:
    eid = ed.insert(packageName=PKG, body={}).execute()["id"]
    b = ed.bundles().upload(packageName=PKG, editId=eid,
                            media_body=MediaFileUpload(aab, mimetype="application/octet-stream", resumable=True)).execute()
    vc = str(b["versionCode"])
    vname = pathlib.Path(aab).stem.removeprefix("vitacode-").split("+")[0]
    print("업로드 versionCode:", vc, "versionName:", vname)
    rel = {"versionCodes": [vc], "status": "completed", "name": f"{vc} ({vname})",
           "releaseNotes": [{"language": k, "text": v} for k, v in NOTES.items()]}
    try:
        ed.tracks().update(packageName=PKG, editId=eid, track=track, body={"releases": [rel]}).execute()
        ed.commit(packageName=PKG, editId=eid).execute()
        print(f"✅ '{track}' 트랙 출시 완료 (completed)")
    except HttpError as e:
        if "draft" not in e.content.decode().lower():
            raise
        rel["status"] = "draft"
        ed.tracks().update(packageName=PKG, editId=eid, track=track, body={"releases": [rel]}).execute()
        ed.commit(packageName=PKG, editId=eid).execute()
        print(f"✅ '{track}' 트랙에 초안 릴리스로 올림 — Play Console 에서 '출시 시작' 필요 (첫 출시)")
except HttpError as e:
    print("[ERROR]", e.resp.status, json.loads(e.content.decode()).get("error", {}).get("message", "")[:400])
    sys.exit(2)
