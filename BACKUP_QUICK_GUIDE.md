# 🚀 Quick Backup Guide

## ✅ Backup Đã Được Tạo!

Bạn đã có **2 backup files** trong folder `backups/`:

```
backups/
├── backup_20251116_190332.sql  (1.98 MB) - Mới nhất
└── backup_20251116_185953.sql  (1.98 MB)
```

**Dữ liệu được backup:**
- ✅ 1,414 problems
- ✅ 60 solved problems
- ✅ Review history
- ✅ Calendar events
- ✅ Tất cả dữ liệu khác

---

## 📝 Lệnh Cơ Bản

### Backup Ngay
```powershell
.\scripts\backup.ps1
```

### Restore (Chọn từ danh sách)
```powershell
.\scripts\restore.ps1
```

### Xem Danh Sách Backup
```powershell
Get-ChildItem backups -Filter "*.sql"
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### ✅ AN TOÀN - Giữ Dữ Liệu
```powershell
docker-compose down          # ← Không có -v
docker-compose restart
```

### ❌ NGUY HIỂM - Mất Dữ Liệu
```powershell
docker-compose down -v       # ← Flag -v xóa volume
docker volume rm leetcodepractice_postgres_data
```

**Nếu vô tình xóa volume:**
1. `docker-compose up -d`
2. `.\scripts\restore.ps1`
3. Chọn backup gần nhất

---

## 🔄 Backup Tự Động

### Setup (Chỉ cần làm 1 lần)

1. Mở Task Scheduler: `Win + R` → `taskschd.msc`
2. Create Basic Task
3. Name: `LeetCode Database Backup`
4. Trigger: Daily, 2:00 AM
5. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "D:\Quang Lam\Coding\Project\leetcodepractice\scripts\backup-auto.ps1"`
   - Start in: `D:\Quang Lam\Coding\Project\leetcodepractice`
6. Finish

**Chi tiết:** Xem [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md)

---

## 📊 Kiểm Tra Backup

### Xem Backup Mới Nhất
```powershell
Get-ChildItem backups -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

### Xem Tất Cả Backup
```powershell
Get-ChildItem backups -Filter "*.sql" | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime
```

### Tổng Dung Lượng
```powershell
$size = (Get-ChildItem backups -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Total: $([math]::Round($size/1MB, 2)) MB"
```

---

## 🆘 Các Tình Huống Thường Gặp

### 1. Mất Dữ Liệu (Xóa Volume)
```powershell
docker-compose up -d
.\scripts\restore.ps1
# Chọn backup gần nhất
```

### 2. Muốn Quay Lại Trạng Thái Cũ
```powershell
.\scripts\restore.ps1
# Chọn backup từ ngày muốn quay lại
```

### 3. Chuyển Sang Máy Mới
```powershell
# Máy cũ: Copy folder backups/
# Máy mới: 
docker-compose up -d
.\scripts\restore.ps1
```

### 4. Test Thử Tính Năng Mới
```powershell
# Backup trước
.\scripts\backup.ps1

# Test tính năng...

# Nếu có vấn đề, restore lại
.\scripts\restore.ps1
```

---

## 📚 Tài Liệu Đầy Đủ

- **Hướng dẫn chi tiết:** [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md)
- **Scripts README:** [scripts/README.md](scripts/README.md)
- **Docker commands:** [DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)

---

## 🎯 Best Practices

1. ✅ **Backup trước khi thay đổi lớn**
   ```powershell
   .\scripts\backup.ps1
   ```

2. ✅ **Setup backup tự động** (Task Scheduler)

3. ✅ **Giữ backup ở nhiều nơi**
   - Local: `backups/`
   - Cloud: Google Drive, OneDrive
   - External: USB drive

4. ✅ **Test restore định kỳ** (mỗi tháng)

5. ❌ **KHÔNG dùng `docker-compose down -v`**

---

## 📞 Cần Giúp Đỡ?

1. Xem logs: `logs/backup_YYYYMMDD.log`
2. Kiểm tra container: `docker ps`
3. Xem documentation: `docs/BACKUP_RESTORE_GUIDE.md`

---

**Dữ liệu của bạn đã được bảo vệ! 🛡️**
