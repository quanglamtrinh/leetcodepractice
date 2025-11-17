# Lệnh Docker An Toàn - Tránh Mất Dữ Liệu

## ✅ LỆNH AN TOÀN (Giữ nguyên dữ liệu)

```bash
# Dừng containers nhưng GIỮ NGUYÊN dữ liệu
docker-compose down

# Khởi động lại
docker-compose up -d

# Restart một service cụ thể
docker-compose restart postgres
docker-compose restart app

# Xem logs
docker-compose logs -f postgres
docker-compose logs -f app
```

## ⚠️ LỆNH NGUY HIỂM (Sẽ XÓA dữ liệu)

```bash
# XÓA TẤT CẢ volumes (bao gồm database)
docker-compose down -v

# Xóa volume cụ thể
docker volume rm leetcodepractice_postgres_data

# Rebuild và tạo lại containers (nếu dùng với -v sẽ mất data)
docker-compose up --build --force-recreate
```

## 🔄 Khi Nào Schema Được Chạy?

Schema trong `/docker-entrypoint-initdb.d/` chỉ chạy **MỘT LẦN DUY NHẤT** khi:
- Volume `postgres_data` được tạo mới (chưa tồn tại)
- Nếu volume đã có dữ liệu → Schema KHÔNG chạy lại

## 💾 Backup Dữ Liệu

```bash
# Backup database
docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > backup.sql

# Restore database
docker exec -i leetcode-postgres psql -U leetcodeuser leetcodepractice < backup.sql
```

## 🔍 Kiểm Tra Dữ Liệu

```bash
# Kết nối vào database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice

# Trong psql:
\dt                          # Liệt kê tables
SELECT COUNT(*) FROM problems;  # Đếm số problems
\q                           # Thoát
```

## 📊 Kiểm Tra Volume

```bash
# Xem danh sách volumes
docker volume ls

# Xem thông tin chi tiết volume
docker volume inspect leetcodepractice_postgres_data
```
