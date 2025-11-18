# Hướng Dẫn Backup và Restore Database

## 📋 Tổng Quan

Project này có 3 script PowerShell để quản lý backup/restore database:

1. **backup.ps1** - Backup thủ công
2. **restore.ps1** - Restore từ backup
3. **backup-auto.ps1** - Backup tự động (dùng cho Task Scheduler)

---

## 💾 Backup Database

### Cách 1: Backup Thủ Công

```powershell
# Chạy từ thư mục gốc project
.\scripts\backup.ps1
```

**Kết quả:**
- Tạo file backup trong folder `backups/`
- Tên file: `backup_YYYYMMDD_HHMMSS.sql`
- Tự động xóa backup cũ (giữ lại 10 backup gần nhất)
- Hiển thị thống kê database

**Output mẫu:**
```
🔄 Starting database backup...
✅ Container is running: Up 16 hours (healthy)
💾 Creating backup: backups/backup_20251116_185953.sql
✅ Backup completed successfully!
📊 File: backups/backup_20251116_185953.sql
📏 Size: 1.98 MB

📈 Database Statistics:
   Total Problems: 1414
   Solved Problems: 60

🎉 Backup process completed!
```

### Cách 2: Backup Tự Động Hàng Ngày

#### Bước 1: Mở Task Scheduler

1. Nhấn `Win + R`
2. Gõ `taskschd.msc`
3. Nhấn Enter

#### Bước 2: Tạo Task Mới

1. Click **"Create Basic Task"**
2. Name: `LeetCode Database Backup`
3. Description: `Daily backup of LeetCode practice database`
4. Click **Next**

#### Bước 3: Cấu Hình Trigger

1. Chọn **"Daily"**
2. Start time: `02:00:00` (2 giờ sáng)
3. Recur every: `1 days`
4. Click **Next**

#### Bước 4: Cấu Hình Action

1. Chọn **"Start a program"**
2. Program/script: `powershell.exe`
3. Add arguments:
   ```
   -ExecutionPolicy Bypass -File "D:\Quang Lam\Coding\Project\leetcodepractice\scripts\backup-auto.ps1"
   ```
   ⚠️ **Thay đổi đường dẫn cho đúng với máy bạn!**
4. Start in: `D:\Quang Lam\Coding\Project\leetcodepractice`
5. Click **Next**

#### Bước 5: Hoàn Tất

1. Check **"Open the Properties dialog"**
2. Click **Finish**

#### Bước 6: Cấu Hình Nâng Cao

Trong Properties dialog:

1. Tab **General**:
   - Check **"Run whether user is logged on or not"**
   - Check **"Run with highest privileges"**

2. Tab **Conditions**:
   - Uncheck **"Start the task only if the computer is on AC power"**
   - Check **"Wake the computer to run this task"** (optional)

3. Tab **Settings**:
   - Check **"Allow task to be run on demand"**
   - Check **"Run task as soon as possible after a scheduled start is missed"**

4. Click **OK**

#### Bước 7: Test Task

1. Right-click task → **Run**
2. Kiểm tra folder `backups/` có file mới không
3. Kiểm tra log trong `logs/backup_YYYYMMDD.log`

---

## 🔄 Restore Database

### Cách 1: Restore Interactive (Chọn từ danh sách)

```powershell
# Chạy script không tham số
.\scripts\restore.ps1
```

**Script sẽ:**
1. Hiển thị danh sách backup có sẵn
2. Cho phép bạn chọn backup muốn restore
3. Hiển thị thông tin backup và database hiện tại
4. Yêu cầu xác nhận trước khi restore

**Output mẫu:**
```
🔄 Database Restore Tool
========================

✅ Container is running: Up 16 hours (healthy)

📁 Available backups:
   [1] backup_20251116_185953.sql - 1.98 MB - 11/16/2025 6:59:54 PM
   [2] backup_20251116_120000.sql - 1.95 MB - 11/16/2025 12:00:00 PM
   [3] backup_20251115_185953.sql - 1.92 MB - 11/15/2025 6:59:53 PM

Select backup number (1-3) or press Enter to cancel: 1

⚠️  WARNING: This will REPLACE all current database data!
📄 Backup file: backup_20251116_185953.sql
📏 Size: 1.98 MB
📅 Created: 11/16/2025 6:59:54 PM

📊 Current Database:
   Total Problems: 1414
   Solved Problems: 60

Type 'YES' to confirm restore: YES

🔄 Starting restore process...
💾 Restoring from: backups/backup_20251116_185953.sql
✅ Restore completed successfully!

📈 Restored Database Statistics:
   Total Problems: 1414
   Solved Problems: 60

🎉 Database restored successfully!
💡 Refresh your browser to see the changes
```

### Cách 2: Restore Trực Tiếp (Chỉ định file)

```powershell
# Restore từ file cụ thể
.\scripts\restore.ps1 backups/backup_20251116_185953.sql
```

---

## 📂 Cấu Trúc Thư Mục

```
leetcodepractice/
├── backups/                          # Folder chứa backup files
│   ├── backup_20251116_185953.sql   # Backup file (tự động đặt tên)
│   ├── backup_20251116_120000.sql
│   └── backup_20251115_185953.sql
│
├── logs/                             # Folder chứa logs (auto-backup)
│   ├── backup_20251116.log
│   └── backup_20251115.log
│
├── scripts/                          # Folder chứa scripts
│   ├── backup.ps1                   # Script backup thủ công
│   ├── restore.ps1                  # Script restore
│   └── backup-auto.ps1              # Script backup tự động
│
└── docs/
    └── BACKUP_RESTORE_GUIDE.md      # File này
```

---

## 🔍 Kiểm Tra Backup

### Xem Danh Sách Backup

```powershell
Get-ChildItem backups -Filter "*.sql" | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime
```

### Xem Nội Dung Backup (10 dòng đầu)

```powershell
Get-Content backups/backup_20251116_185953.sql -Head 10
```

### Kiểm Tra Kích Thước Backup

```powershell
$file = Get-Item backups/backup_20251116_185953.sql
Write-Host "Size: $([math]::Round($file.Length/1MB, 2)) MB"
```

---

## 🚨 Các Tình Huống Thường Gặp

### Tình Huống 1: Mất Dữ Liệu Do Xóa Volume

**Vấn đề:**
```powershell
docker-compose down -v  # ← Xóa volume, mất hết dữ liệu
```

**Giải pháp:**
```powershell
# 1. Start lại containers
docker-compose up -d

# 2. Restore từ backup gần nhất
.\scripts\restore.ps1

# 3. Chọn backup gần nhất
# 4. Confirm restore
```

### Tình Huống 2: Database Bị Corrupt

**Vấn đề:**
- Container không khởi động
- PostgreSQL báo lỗi

**Giải pháp:**
```powershell
# 1. Stop containers
docker-compose down

# 2. Xóa volume cũ (đã corrupt)
docker volume rm leetcodepractice_postgres_data

# 3. Start lại (tạo volume mới)
docker-compose up -d

# 4. Đợi container healthy
Start-Sleep -Seconds 10

# 5. Restore từ backup
.\scripts\restore.ps1
```

### Tình Huống 3: Muốn Reset Database

**Giải pháp:**
```powershell
# 1. Backup trước khi reset (để phòng)
.\scripts\backup.ps1

# 2. Stop containers và xóa volume
docker-compose down -v

# 3. Start lại (database trống)
docker-compose up -d

# 4. Import lại CSV (nếu cần)
docker exec -it leetcode-app node server/scripts/importProblems.js
```

### Tình Huống 4: Chuyển Sang Máy Mới

**Trên máy cũ:**
```powershell
# 1. Backup database
.\scripts\backup.ps1

# 2. Copy file backup
# backups/backup_YYYYMMDD_HHMMSS.sql
```

**Trên máy mới:**
```powershell
# 1. Clone project
git clone <repo>

# 2. Copy file backup vào folder backups/

# 3. Start containers
docker-compose up -d

# 4. Restore
.\scripts\restore.ps1
```

---

## 📊 Monitoring và Logs

### Xem Log Backup Tự Động

```powershell
# Xem log hôm nay
Get-Content logs/backup_$(Get-Date -Format 'yyyyMMdd').log

# Xem log ngày cụ thể
Get-Content logs/backup_20251116.log

# Theo dõi log real-time (nếu đang chạy)
Get-Content logs/backup_$(Get-Date -Format 'yyyyMMdd').log -Wait
```

### Kiểm Tra Task Scheduler

```powershell
# Xem trạng thái task
Get-ScheduledTask -TaskName "LeetCode Database Backup"

# Xem lịch sử chạy
Get-ScheduledTask -TaskName "LeetCode Database Backup" | Get-ScheduledTaskInfo
```

---

## ⚙️ Cấu Hình Nâng Cao

### Thay Đổi Số Lượng Backup Giữ Lại

Mặc định: Giữ 10 backup gần nhất

**Chỉnh sửa:** `scripts/backup.ps1`

```powershell
# Tìm dòng này (khoảng dòng 50)
if ($backups.Count -gt 10) {

# Thay 10 thành số khác, ví dụ 20
if ($backups.Count -gt 20) {
```

### Thay Đổi Giờ Backup Tự Động

1. Mở Task Scheduler
2. Right-click task **"LeetCode Database Backup"**
3. Click **Properties**
4. Tab **Triggers** → Edit
5. Thay đổi thời gian
6. Click **OK**

### Backup Sang Cloud Storage

**Ví dụ: Backup lên Google Drive**

```powershell
# Sau khi backup, copy lên Google Drive
.\scripts\backup.ps1

# Copy file mới nhất lên Google Drive
$latestBackup = Get-ChildItem backups -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item $latestBackup.FullName "G:\My Drive\LeetCode Backups\"
```

---

## 🎯 Best Practices

### 1. Backup Trước Khi Thay Đổi Lớn

```powershell
# Trước khi update schema, migrate, hoặc thay đổi lớn
.\scripts\backup.ps1
```

### 2. Test Restore Định Kỳ

```powershell
# Mỗi tháng, test restore để đảm bảo backup hoạt động
# Trên môi trường test, không phải production
.\scripts\restore.ps1
```

### 3. Giữ Backup Ở Nhiều Nơi

- ✅ Local: `backups/` folder
- ✅ Cloud: Google Drive, OneDrive, Dropbox
- ✅ External: USB drive, external HDD

### 4. Đặt Tên Backup Có Ý Nghĩa

```powershell
# Backup trước khi deploy feature mới
.\scripts\backup.ps1
# Sau đó rename file
Rename-Item backups/backup_20251116_185953.sql backups/backup_before_calendar_feature.sql
```

### 5. Monitor Disk Space

```powershell
# Kiểm tra dung lượng folder backups
$size = (Get-ChildItem backups -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Total backup size: $([math]::Round($size/1GB, 2)) GB"
```

---

## 🆘 Troubleshooting

### Lỗi: "Container is not running"

**Giải pháp:**
```powershell
docker-compose up -d
Start-Sleep -Seconds 10
.\scripts\backup.ps1
```

### Lỗi: "Permission denied"

**Giải pháp:**
```powershell
# Chạy PowerShell as Administrator
# Hoặc thay đổi execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Lỗi: "pg_dump: command not found"

**Nguyên nhân:** Container không có PostgreSQL tools

**Giải pháp:** Đảm bảo dùng đúng container name `leetcode-postgres`

### Backup File Quá Lớn

**Giải pháp:** Compress backup

```powershell
# Sau khi backup, compress file
$latestBackup = Get-ChildItem backups -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Compress-Archive -Path $latestBackup.FullName -DestinationPath "$($latestBackup.FullName).zip"
Remove-Item $latestBackup.FullName
```

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs: `logs/backup_YYYYMMDD.log`
2. Kiểm tra container: `docker ps`
3. Kiểm tra database: `docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice`
4. Xem documentation: `docs/` folder

---

## 📝 Summary

**Backup thủ công:**
```powershell
.\scripts\backup.ps1
```

**Restore:**
```powershell
.\scripts\restore.ps1
```

**Setup backup tự động:**
- Dùng Task Scheduler
- Chạy `backup-auto.ps1` hàng ngày lúc 2 giờ sáng
- Giữ 10 backup gần nhất
- Log vào `logs/` folder

**Quan trọng:**
- ✅ Backup trước khi thay đổi lớn
- ✅ Test restore định kỳ
- ✅ Giữ backup ở nhiều nơi
- ❌ KHÔNG dùng `docker-compose down -v` (sẽ mất dữ liệu)
