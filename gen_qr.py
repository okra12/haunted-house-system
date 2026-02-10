import qrcode
import os

# 10.22.242.115 を指定
ip_address = "10.22.242.115" 
port = "3000"
url = f"http://{ip_address}:{port}"

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("reception_qr.png")

print(f"QRコードを生成しました: {url}")