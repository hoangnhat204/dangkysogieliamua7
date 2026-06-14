# Chay Online Voi Vercel + Supabase

Project nay da duoc doi backend sang `Vercel Serverless Function` tai `api/index.js`.

## Can chuan bi
- Tai khoan `Vercel`
- Tai khoan `Supabase`
- Tao bang du lieu bang file `supabase-schema.sql`

## Tao bang tren Supabase
1. Mo SQL Editor trong Supabase.
2. Copy toan bo noi dung file `supabase-schema.sql`.
3. Chay SQL de tao bang `submissions`.

## Cau hinh bien moi truong tren Vercel
Them cac bien moi truong sau:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Neu khong dat `ADMIN_USERNAME` va `ADMIN_PASSWORD`, code hien tai mac dinh la:

- Username: `cvct`
- Password: `123`

## Cach deploy
1. Day project len GitHub hoac import thang vao Vercel.
2. Tren Vercel, gan project nay va them cac Environment Variables o tren.
3. Deploy lai project.
4. Mo link `https://ten-mien-cua-ban.vercel.app/api?action=admin_status`
5. Neu dung, API se tra JSON co dang:

```json
{"ok":true,"authenticated":false}
```

6. Sau do mo `dang-ky.html` de gui thu mot ho so.
7. Dang nhap `login.html`, roi vao `admin.html` de xem du lieu.

## Luu y
- `Vercel` khong phu hop de chay `PHP + SQLite` trong project nay, vi vay frontend da duoc chuyen sang goi `/api`.
- Backend hien tai duoc dung online la `api/index.js`.
- Neu trang bao `Server dang tra ve HTML thay vi JSON`, can kiem tra lai deploy Vercel va route `/api`.
