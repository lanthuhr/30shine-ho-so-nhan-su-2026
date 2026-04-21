# Hoàn thiện Hồ sơ Nhân sự — 30Shine 2026

Form khảo sát Profile thợ 30Shine (Broad Survey — Vòng 1 của PA đơn giản).
Dùng để lọc thợ từng làm tại Danh sách 30 salon + thu data range tham chiếu thu nhập/cơ chế.

- **Stylist / SMST** — 13 câu, ~3–5 phút
- **Skinner** — 13 câu, ~3–5 phút

## Cấu trúc repo

- `index.html` — form duy nhất (single-file, inline CSS + JS). Chọn vị trí → hiện đúng bộ câu hỏi.
- `apps_script.gs` — backend Google Apps Script, route submission vào 2 tab `Stylist` / `Skinner`.
- `.github/workflows/deploy.yml` — auto deploy lên GitHub Pages khi push `main`.
- `.gitignore`

## Quy trình setup (1 lần)

### 1. Tạo Google Sheet nhận data

1. Vào https://sheets.google.com → tạo sheet mới, đặt tên *"Hồ sơ Nhân sự 30Shine — Responses 2026"*
2. Copy **SHEET_ID** từ URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### 2. Deploy Apps Script

1. Trong sheet vừa tạo → menu **Extensions → Apps Script**
2. Xóa code mặc định → paste toàn bộ nội dung `apps_script.gs`
3. Thay biến `SHEET_ID` ở đầu file bằng ID copy ở bước 1
4. `Ctrl+S` lưu, đặt tên project *"Profile Tho Receiver"*
5. Chọn function `setupSheets` → nút **Run** → authorize quyền
   → 2 tab `Stylist` + `Skinner` được tạo với header đầy đủ
6. Bấm **Deploy → New deployment** → chọn type **Web app**
   - Description: `Profile Tho v1`
   - Execute as: **Me** (lanthuhr@...)
   - Who has access: **Anyone**
   - Bấm **Deploy** → copy **Web app URL**

### 3. Cập nhật URL vào form

Mở `index.html`, tìm dòng:

```javascript
const GOOGLE_SCRIPT_URL = '';
```

Dán URL của Apps Script vào, ví dụ:

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

### 4. Deploy lên GitHub Pages

```bash
cd Survey_Profile_Tho
git init
git add .
git commit -m "init: Survey Profile thợ 30Shine 2026"
gh repo create 30shine-ho-so-nhan-su-2026 --public --source=. --push
```

Sau đó vào repo trên GitHub → **Settings → Pages** → Source chọn **GitHub Actions**.

Workflow `deploy.yml` sẽ tự chạy. Sau 1–2 phút, form live tại:

```
https://lanthuhr.github.io/30shine-ho-so-nhan-su-2026/
```

## Test nhanh

- Trong Apps Script editor, chạy `testStylist()` hoặc `testSkinner()` để gửi data mẫu
- Kiểm tra 2 tab `Stylist` / `Skinner` trong Google Sheet xem có row mới không

## Cấu trúc câu hỏi (source: Khao sat Lan 2/Form_Broad_Survey_*.md)

### Phần 1 — Thông tin cơ bản (7 câu)
Họ tên · Mã NV · SĐT/Zalo · Salon · Vị trí · Vào 30Shine từ · Khu vực sinh sống

### Phần 2 — Hành trình nghề (2 câu)
- B1: Tổng số năm làm ngành (radio)
- B2: Học nghề từ đâu (radio + other)

### Phần 3 — Các nơi đã làm TRƯỚC 30Shine (repeat block × 3)
Mỗi nơi làm thu 10 field: tên, địa chỉ chi tiết, còn hoạt động không, vị trí, từ/đến,
thu nhập range + cơ chế trả lương ("viên gạch").

### Phần 4 — Thế mạnh & Chuyên môn (3 câu)
- C1: Dịch vụ tự tin nhất (checkbox, max 3) — list khác nhau giữa Stylist và Skinner
- C2: Tệp khách phục vụ tốt nhất (checkbox, max 3)
- C3: Ngoại ngữ (checkbox + other)

## Data schema (trong Google Sheet)

Cả 2 tab `Stylist` và `Skinner` dùng cùng header (49 cột) để dễ phân tích đồng nhất:

- `submission_id`, `timestamp`, `role`
- `A0..A6` — Thông tin cơ bản (8 cột, A5 tách `thang`/`nam`)
- `B1`, `B2_*`, `B3_wp_chua_tung_*` — Hành trình nghề (4 cột trực tiếp)
- `B3_wp1_*`, `B3_wp2_*`, `B3_wp3_*` — 3 nơi làm × 9 cột mỗi nơi (27 cột)
- `C1`, `C2`, `C3_*` — Thế mạnh (4 cột; checkbox được join bằng `"; "`)

## Troubleshooting

- **Form không submit được**: Check biến `GOOGLE_SCRIPT_URL` trong `index.html` có đúng không. Check tab Network console browser xem response status.
- **Sheet không có data mới**: Trong Apps Script → **Executions** xem log lỗi. Thường do authorize chưa đủ quyền hoặc `SHEET_ID` sai.
- **GitHub Pages 404**: Vào **Settings → Pages** → Source phải là **GitHub Actions** (không phải *Deploy from a branch*).

## Ghi chú triển khai

- Kênh phân phối: Zalo group salon (SM pin), briefing sáng, email cá nhân
- Thời gian thu: 3–5 ngày, nhắc lại ngày 3
- Role mong đợi (vòng 1): lọc thợ từng làm tại Danh sách 30 salon → chọn thợ cho Vòng 2 (xin bằng chứng lương)
- Dữ liệu dự phòng: Q10 (3 viên gạch thu nhập/cơ chế) cho benchmark dù thợ không gửi bằng chứng sau đó
