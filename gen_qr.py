import qrcode
import os

# --- 修正ポイント：URLを本番用の一つに絞る ---
# ローカルIPやポート番号はもう不要です
url = "https://haunted-house-system.vercel.app"

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H, # 汚れに強い設定
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("reception_qr.png")

print(f" 本番用QRコードを生成しました: {url}")