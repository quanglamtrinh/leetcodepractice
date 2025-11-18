# Database Persistence & Data Loss Prevention

## Tại sao database bị mất dữ liệu?

### Cơ chế Docker Volume

Docker sử dụng **volumes** để lưu trữ dữ liệu persistent:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data  # Dữ liệu database
  - ./comprehensive-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql  # Schema init
```

### Khi nào dữ liệu bị mất?

#### ❌ Trường hợp 1: `docker-compose down -v`
```bash
docker-compose down -v  # Flag -v XÓA VOLUMES
```
**Hậu quả:** Volume `postgres_data` bị xóa → Mất toàn bộ dữ liệu

#### ❌ Trường hợp 2: Xóa volume thủ công
```bash
docker volume rm leetcodepractice_postgres_data
```

#### ❌ Trường hợp 3: Schema được chạy lại
- PostgreSQL Docker tự động chạy files trong `/docker-entrypoint-initdb.d/`
- **CHỈ CHẠY KHI DATABASE CHƯA TỒN TẠI** (volume trống)
- `comprehensive-schema.sql` có `DROP TABLE IF EXISTS` → Xóa hết dữ liệu cũ

### Kịch bản mất dữ liệu thực tế:

```
1. Làm việc với database, có 60 solved problems
2. Chạy docker-compose down -v (vô tình hoặc để "clean up")
3. Volume bị xóa
4. Chạy docker-compose up lại
5. Schema được chạy lại → DROP TABLE → Database trống
6. Import lại CSV → Chỉ có problems mới, mất hết trạng thái solved
```

## Cách phòng tránh mất dữ liệu

### ✅ 1. KHÔNG BAO GIỜ dùng `-v` flag

```bash
# ❌ NGUY HIỂM
docker-compose down -v

# ✅ AN TOÀN
docker-compose down        # Stop và remove containers
docker-compose stop        # Chỉ stop containers
docker-compose restart app # Restart một service
```

### ✅ 2. Backup thường xuyên

```bash
# Backup trước khi làm gì đó quan trọng
npm run db:backup

# Backup sẽ được lưu trong thư mục backups/
# File format: leetcode-backup-YYYY-MM-DDTHH-MM-SS.sql
```

### ✅ 3. Restore khi cần

```bash
# Restore từ backup trong project
npm run db:restore <backup-filename>

# Restore từ file local (ví dụ từ pgAdmin)
npm run db:restore-local "C:\path\to\backup.sql"
```

### ✅ 4. Kiểm tra volume trước khi xóa

```bash
# Xem danh sách volumes
docker volume ls

# Kiểm tra volume có dữ liệu không
docker volume inspect leetcodepractice_postgres_data

# Chỉ xóa khi chắc chắn đã backup
docker volume rm leetcodepractice_postgres_data
```

## Khôi phục dữ liệu đã mất

### Nếu có backup từ pgAdmin:

1. Export từ pgAdmin:
   - Right-click database → Backup
   - Format: **Plain** (SQL file)
   - Options: **Only data** (nếu schema đã có)

2. Restore vào Docker:
   ```bash
   npm run db:restore-local "C:\path\to\backup.sql"
   ```

### Nếu không có backup:

- Dữ liệu đã mất vĩnh viễn
- Phải bắt đầu lại từ đầu
- Import lại CSV và mark lại solved problems

## Best Practices

### 1. Backup tự động

Thêm vào workflow hàng ngày:
```bash
# Chạy mỗi sáng hoặc trước khi deploy
npm run db:backup
```

### 2. Sử dụng Git để track backups

```bash
# Thêm backups vào .gitignore nếu file quá lớn
echo "backups/*.sql" >> .gitignore

# Hoặc commit backups quan trọng
git add backups/leetcode-backup-important.sql
git commit -m "Backup before major changes"
```

### 3. Separate development và production data

- Development: Có thể reset khi cần
- Production: LUÔN LUÔN backup trước khi thay đổi

### 4. Monitor volume size

```bash
# Kiểm tra kích thước volume
docker system df -v
```

## Troubleshooting

### Volume bị đầy?

```bash
# Xem dung lượng
docker system df

# Dọn dẹp (KHÔNG xóa volumes đang dùng)
docker system prune
```

### Database không khởi động?

```bash
# Xem logs
docker logs leetcode-postgres

# Kiểm tra health
docker ps
```

### Restore bị lỗi?

```bash
# Truncate tables trước khi restore
docker exec leetcode-postgres psql -U leetcodeuser -d leetcodepractice -c "TRUNCATE problems CASCADE;"

# Sau đó restore lại
npm run db:restore-local "path/to/backup.sql"
```

## Tóm tắt

**LUÔN NHỚ:**
- ❌ KHÔNG dùng `docker-compose down -v`
- ✅ Backup trước khi thay đổi quan trọng
- ✅ Dùng `docker-compose down` hoặc `stop` thay vì `-v`
- ✅ Kiểm tra volume trước khi xóa
- ✅ Giữ backup ở nhiều nơi (local, cloud, git)
