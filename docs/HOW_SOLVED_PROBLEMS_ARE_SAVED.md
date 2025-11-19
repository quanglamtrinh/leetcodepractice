# Cách Dữ Liệu "Solved Problems" Được Lưu Vĩnh Viễn

## 🎯 Câu Hỏi Chính

**"Vì sao các data như solved problems lại được lưu vào database?"**

**Trả lời:** Dữ liệu solved problems được lưu **VĨNH VIỄN** trong PostgreSQL database thông qua Docker volume `postgres_data`. Khi bạn đánh dấu một problem là "solved", nó được UPDATE trực tiếp vào database và sẽ **TỒN TẠI MÃI MÃI** trừ khi bạn xóa volume.

---

## 🔄 Luồng Hoàn Chỉnh: Từ Click Button → Lưu Database

### Bước 1: User Click "Mark as Solved" Button

**File:** `client/src/components/SolvedToggleButton.tsx`

```typescript
const handleToggleSolved = async () => {
  if (isAnimating) return;
  
  setIsAnimating(true);
  
  if (isSolved) {
    // Unsolve
    setIsSolved(false);
    setTimeout(async () => {
      await onToggle(problem.id);  // ← Gọi callback từ parent
    }, 300);
  } else {
    // Solve
    setIsSolved(true);
    setTimeout(async () => {
      await onToggle(problem.id);  // ← Gọi callback từ parent
    }, 300);
  }
};
```

**Điều gì xảy ra:**
1. User click button
2. UI update ngay lập tức (optimistic update)
3. Sau 300ms animation, gọi `onToggle(problem.id)`

---

### Bước 2: Parent Component Xử Lý Toggle

**File:** `client/src/App.tsx`

```typescript
const markAsSolvedToggle = async (problemId: number) => {
  // 1. Tìm problem hiện tại
  const currentProblem = problems.find(p => p.id === problemId);
  if (!currentProblem) return;
  
  // 2. Đảo ngược trạng thái solved
  const newSolvedState = !currentProblem.solved;
  
  // 3. GỬI REQUEST ĐẾN BACKEND
  await fetch(`/api/problems/${problemId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solved: newSolvedState })
  });
  
  // 4. Invalidate calendar cache
  if (newSolvedState) {
    calendarService.invalidateCacheForProblemSolved(new Date());
  } else {
    calendarService.clearCache();
  }
  
  // 5. Refresh danh sách problems từ database
  fetch('/api/problems')
    .then(res => res.json())
    .then(setProblems);
    
  fetch('/api/solved')
    .then(res => res.json())
    .then(setSolvedProblems);
};
```

**Điều gì xảy ra:**
1. Xác định trạng thái mới (solved = true/false)
2. **GỬI HTTP PUT REQUEST** đến backend API
3. Clear cache
4. Refresh UI từ database (để đảm bảo sync)

---

### Bước 3: Backend API Nhận Request

**File:** `server/routes/problemRoutes.js`

```javascript
// PUT /api/problems/:id/progress - Update progress
router.put('/:id/progress', problemController.updateProgress);
```

**Routing:**
- URL: `PUT /api/problems/123/progress`
- Controller: `problemController.updateProgress`

---

### Bước 4: Controller Xử Lý và LƯU VÀO DATABASE

**File:** `server/controllers/problemController.js`

```javascript
exports.updateProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;  // Problem ID từ URL
  const { solved, notes, solution, solved_date } = req.body;
  
  // Validate
  if (typeof solved !== 'boolean') {
    throw ApiError.badRequest('solved must be a boolean');
  }

  const solutionValue = solution && solution.trim() !== '' 
    ? parseInt(solution) 
    : null;
  
  // ═══════════════════════════════════════════════════════
  // ⭐ BƯỚC QUAN TRỌNG NHẤT: UPDATE DATABASE
  // ═══════════════════════════════════════════════════════
  const result = await pool.query(
    `UPDATE problems 
     SET solved = $1, 
         notes = $2, 
         solution = $3, 
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = $4 
     RETURNING *`,
    [solved, notes, solutionValue, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Problem not found');
  }

  // Nếu solved = true, thêm vào review history
  if (solved) {
    await pool.query(
      'SELECT add_review_session($1, $2, $3, NULL)', 
      [id, 'remembered', notes || 'Initial solve']
    );
  } else {
    // Nếu unsolved, xóa review history
    await pool.query(
      'DELETE FROM review_history WHERE problem_id = $1', 
      [id]
    );
  }

  // Trả về problem đã update
  res.json(result.rows[0]);
});
```

**Điều gì xảy ra:**

#### 4.1. UPDATE Query Được Thực Thi

```sql
UPDATE problems 
SET solved = true,              -- ← Đánh dấu solved
    notes = 'My notes',         -- ← Lưu notes (nếu có)
    solution = NULL,            -- ← Lưu solution (nếu có)
    updated_at = CURRENT_TIMESTAMP  -- ← Update timestamp
WHERE id = 123 
RETURNING *;
```

**Kết quả:**
- Row trong bảng `problems` được **UPDATE TRỰC TIẾP**
- Dữ liệu được ghi vào **DISK** (không phải RAM)
- PostgreSQL commit transaction

#### 4.2. Thêm Review Session (Nếu Solved)

```sql
SELECT add_review_session(123, 'remembered', 'Initial solve', NULL);
```

**Function `add_review_session` làm gì:**
```sql
-- Tính toán next review date dựa trên spaced repetition
-- Insert vào bảng review_history
INSERT INTO review_history (
    problem_id, 
    review_date, 
    result, 
    interval_days, 
    next_review_date,
    review_notes,
    time_spent_minutes
) VALUES (
    123,                    -- problem_id
    CURRENT_DATE,           -- hôm nay
    'remembered',           -- result
    1,                      -- interval (1 ngày cho lần đầu)
    CURRENT_DATE + 1,       -- next review = ngày mai
    'Initial solve',        -- notes
    NULL                    -- time spent
);

-- Insert vào bảng review_attempts
INSERT INTO review_attempts (
    problem_id,
    success,
    time_spent_minutes,
    notes
) VALUES (
    123,
    true,
    NULL,
    'Initial solve'
);
```

---

### Bước 5: Dữ Liệu Được Lưu Vào Docker Volume

**Docker Volume:** `postgres_data`

```yaml
volumes:
  postgres_data:
    driver: local
```

**Cơ chế lưu trữ:**

```
┌─────────────────────────────────────────────────────────┐
│ PostgreSQL Container                                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ PostgreSQL Process                               │  │
│  │                                                  │  │
│  │  UPDATE problems SET solved = true WHERE id=123 │  │
│  │                                                  │  │
│  │  ↓                                               │  │
│  │  Write to WAL (Write-Ahead Log)                 │  │
│  │  ↓                                               │  │
│  │  Commit Transaction                             │  │
│  │  ↓                                               │  │
│  │  Flush to Disk                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ /var/lib/postgresql/data                        │  │
│  │ (Mounted from Docker Volume)                    │  │
│  │                                                  │  │
│  │  ├── base/                                       │  │
│  │  │   └── 16384/                                 │  │
│  │  │       └── problems table data                │  │
│  │  ├── pg_wal/                                     │  │
│  │  └── pg_xlog/                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Docker Volume: postgres_data                            │
│ Location: /var/lib/docker/volumes/                     │
│           leetcodepractice_postgres_data/_data          │
│                                                         │
│ ⭐ DỮ LIỆU ĐƯỢC LƯU VẬT LÝ TRÊN Ổ CỨNG                  │
│ ⭐ TỒN TẠI VĨNH VIỄN (trừ khi xóa volume)               │
└─────────────────────────────────────────────────────────┘
```

**Đặc điểm của Docker Volume:**
- ✅ **Persistent** - Tồn tại ngay cả khi container bị xóa
- ✅ **Durable** - Được lưu trên ổ cứng vật lý
- ✅ **Isolated** - Mỗi volume độc lập
- ✅ **Reusable** - Container mới có thể mount volume cũ

---

## 📊 Kiểm Chứng: Dữ Liệu Có Thực Sự Được Lưu?

### Test 1: Restart Container

```bash
# 1. Đánh dấu một problem là solved
# 2. Restart container
docker-compose restart postgres

# 3. Kiểm tra database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice \
  -c "SELECT id, title, solved FROM problems WHERE solved = true;"
```

**Kết quả:** ✅ Dữ liệu VẪN CÒN (vì volume không bị xóa)

---

### Test 2: Stop và Start Lại Container

```bash
# 1. Đánh dấu một problem là solved
# 2. Stop containers
docker-compose down

# 3. Start lại
docker-compose up -d

# 4. Kiểm tra database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice \
  -c "SELECT id, title, solved FROM problems WHERE solved = true;"
```

**Kết quả:** ✅ Dữ liệu VẪN CÒN (volume được mount lại)

---

### Test 3: Xóa Container Nhưng Giữ Volume

```bash
# 1. Đánh dấu một problem là solved
# 2. Xóa container (KHÔNG xóa volume)
docker-compose down

# 3. Xóa image
docker rmi postgres:15-alpine

# 4. Tạo lại container
docker-compose up -d

# 5. Kiểm tra database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice \
  -c "SELECT id, title, solved FROM problems WHERE solved = true;"
```

**Kết quả:** ✅ Dữ liệu VẪN CÒN (volume không bị động đến)

---

### Test 4: XÓA VOLUME (Dữ liệu sẽ MẤT)

```bash
# 1. Đánh dấu một problem là solved
# 2. Xóa containers VÀ volumes
docker-compose down -v  # ← Flag -v xóa volumes

# 3. Tạo lại
docker-compose up -d

# 4. Kiểm tra database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice \
  -c "SELECT id, title, solved FROM problems WHERE solved = true;"
```

**Kết quả:** ❌ Dữ liệu BỊ MẤT (volume mới được tạo, database trống)

---

## 🔍 Tại Sao Bạn Thấy "Giống Chạy Lại Database Từ Đầu"?

### Nguyên Nhân 1: Volume Bị Xóa

Nếu bạn chạy:
```bash
docker-compose down -v
```

→ Volume `postgres_data` bị xóa
→ Lần khởi động tiếp theo, volume mới được tạo
→ Schema chạy lại từ đầu với `DROP TABLE IF EXISTS`
→ Tất cả dữ liệu cũ bị mất

### Nguyên Nhân 2: Volume Bị Corrupt

Nếu:
- Docker crash
- Máy tính tắt đột ngột
- Ổ cứng bị lỗi

→ Volume có thể bị corrupt
→ PostgreSQL không khởi động được
→ Phải tạo volume mới

### Nguyên Nhân 3: Nhầm Lẫn Giữa Các Project

Nếu bạn có nhiều project:
```bash
project1/docker-compose.yml  → volume: project1_postgres_data
project2/docker-compose.yml  → volume: project2_postgres_data
```

→ Mỗi project có volume riêng
→ Dữ liệu không share giữa các project

---

## 💾 Cách Đảm Bảo Dữ Liệu KHÔNG BAO GIỜ MẤT

### 1. KHÔNG BAO GIỜ Dùng Flag `-v`

```bash
# ❌ NGUY HIỂM - Xóa volumes
  docker-compose down -v

# ✅ AN TOÀN - Giữ volumes
docker-compose down
```

### 2. Backup Thường Xuyên

**Script tự động backup:**

```bash
# File: backup-daily.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice \
  > backups/backup_$DATE.sql
```

**Chạy mỗi ngày:**
```bash
# Crontab
0 2 * * * /path/to/backup-daily.sh
```

### 3. Kiểm Tra Volume Trước Khi Xóa

```bash
# Xem danh sách volumes
docker volume ls

# Xem chi tiết volume
docker volume inspect leetcodepractice_postgres_data

# Kiểm tra dữ liệu trong volume
docker run --rm -v leetcodepractice_postgres_data:/data alpine ls -la /data
```

### 4. Export Volume Thành File

```bash
# Backup toàn bộ volume
docker run --rm \
  -v leetcodepractice_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_backup.tar.gz -C /data .

# Restore volume từ backup
docker run --rm \
  -v leetcodepractice_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_volume_backup.tar.gz -C /data
```

---

## 📈 Luồng Dữ Liệu Hoàn Chỉnh (Tóm Tắt)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER CLICK "MARK AS SOLVED"                              │
│    Component: SolvedToggleButton.tsx                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. FRONTEND CALL API                                         │
│    PUT /api/problems/123/progress                            │
│    Body: { solved: true }                                    │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. BACKEND CONTROLLER                                        │
│    problemController.updateProgress()                        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. DATABASE QUERY                                            │
│    UPDATE problems SET solved = true WHERE id = 123          │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. POSTGRESQL WRITE TO DISK                                 │
│    /var/lib/postgresql/data (trong container)                │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. DOCKER VOLUME PERSISTENCE                                │
│    postgres_data volume (trên host machine)                  │
│    ⭐ DỮ LIỆU LƯU VĨNH VIỄN TẠI ĐÂY                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 7. FRONTEND REFRESH                                          │
│    GET /api/problems → Lấy dữ liệu mới từ database           │
│    UI update với solved = true                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Kết Luận

### Câu Trả Lời Ngắn Gọn:

**Dữ liệu solved problems được lưu VĨNH VIỄN vì:**

1. ✅ **UPDATE trực tiếp vào PostgreSQL database** (không phải localStorage hay memory)
2. ✅ **PostgreSQL lưu dữ liệu vào disk** (không phải RAM)
3. ✅ **Docker volume mount disk vào container** (persistent storage)
4. ✅ **Volume tồn tại độc lập với container** (không bị xóa khi container restart)

### Khi Nào Dữ Liệu Bị Mất:

❌ Chạy `docker-compose down -v` (xóa volume)
❌ Xóa volume thủ công: `docker volume rm leetcodepractice_postgres_data`
❌ Volume bị corrupt (crash, power loss)
❌ Chạy lại schema với DROP TABLE (khi volume mới được tạo)

### Cách Bảo Vệ Dữ Liệu:

✅ Luôn dùng `docker-compose down` (không có `-v`)
✅ Backup database thường xuyên
✅ Kiểm tra volume trước khi xóa
✅ Export volume thành file backup
✅ Sử dụng script restore tự động
