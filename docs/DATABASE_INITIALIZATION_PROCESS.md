# Quá Trình Khởi Tạo Database Từ File CSV

## 📋 Tổng Quan

Quá trình khởi tạo database diễn ra qua 3 giai đoạn chính:
1. **Khởi tạo PostgreSQL Container**
2. **Tạo Schema và Tables**
3. **Import dữ liệu từ CSV**

---

## 🔄 Giai Đoạn 1: Khởi Tạo PostgreSQL Container

### Bước 1.1: Khởi động Docker Compose

```bash
docker-compose up -d
```

**Điều gì xảy ra:**
- Docker tạo network `leetcode-network`
- Docker kiểm tra volume `postgres_data`:
  - **Nếu volume CHƯA TỒN TẠI** → Tạo volume mới (database trống)
  - **Nếu volume ĐÃ TỒN TẠI** → Sử dụng lại (giữ nguyên dữ liệu cũ)

### Bước 1.2: PostgreSQL Container Khởi Động

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: leetcodepractice      # Tên database
    POSTGRES_USER: leetcodeuser        # Username
    POSTGRES_PASSWORD: 1               # Password
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./comprehensive-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
```

**Điều gì xảy ra:**
1. PostgreSQL image được pull (nếu chưa có)
2. Container `leetcode-postgres` được tạo
3. PostgreSQL server khởi động
4. Database `leetcodepractice` được tạo
5. User `leetcodeuser` được tạo với password `1`

---

## 🏗️ Giai Đoạn 2: Tạo Schema và Tables

### Điều Kiện Quan Trọng ⚠️

Script trong `/docker-entrypoint-initdb.d/` **CHỈ CHẠY MỘT LẦN DUY NHẤT** khi:
- Volume `postgres_data` là **MỚI** (chưa có dữ liệu)
- Nếu volume đã tồn tại → Script **KHÔNG CHẠY**

### Bước 2.1: PostgreSQL Phát Hiện Init Scripts

PostgreSQL tự động quét thư mục `/docker-entrypoint-initdb.d/` và thực thi:
- File `.sql` theo thứ tự alphabet
- File `01-schema.sql` được chạy đầu tiên

### Bước 2.2: Thực Thi comprehensive-schema.sql

**Thứ tự thực hiện:**

#### 1. Xóa Tables Cũ (Nếu Có)
```sql
DROP TABLE IF EXISTS problem_tags CASCADE;
DROP TABLE IF EXISTS mistakes CASCADE;
DROP TABLE IF EXISTS review_attempts CASCADE;
-- ... (xóa tất cả tables)
```

#### 2. Xóa ENUM Types Cũ
```sql
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS review_result CASCADE;
DROP TYPE IF EXISTS mistake_type CASCADE;
```

#### 3. Tạo ENUM Types Mới
```sql
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE review_result AS ENUM ('remembered', 'forgot');
CREATE TYPE mistake_type AS ENUM (
    'logic_error', 'syntax_error', 'edge_case', ...
);
```

#### 4. Tạo Core Tables
```sql
-- Bảng concepts (khái niệm)
CREATE TABLE concepts (
    id BIGSERIAL PRIMARY KEY,
    concept_id VARCHAR(50) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng techniques (kỹ thuật)
CREATE TABLE techniques (...);

-- Bảng goals (mục tiêu)
CREATE TABLE goals (...);

-- Bảng template_basics (template cơ bản)
CREATE TABLE template_basics (...);

-- Bảng template_variants (biến thể template)
CREATE TABLE template_variants (...);
```

#### 5. Tạo Pattern và Variant Tables
```sql
CREATE TABLE patterns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_id BIGINT REFERENCES template_basics(id),
    concept_id BIGINT REFERENCES concepts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE variants (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    use_when TEXT,
    notes TEXT,
    pattern_id BIGINT REFERENCES patterns(id),
    technique_id BIGINT REFERENCES techniques(id),
    goal_id BIGINT REFERENCES goals(id),
    concept_id BIGINT REFERENCES concepts(id),
    template_pattern_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. Tạo Problems Table (Bảng Chính)
```sql
CREATE TABLE problems (
    id BIGSERIAL PRIMARY KEY,
    problem_id BIGINT UNIQUE NOT NULL,        -- Số thứ tự LeetCode
    title VARCHAR(255) NOT NULL,              -- Tên bài
    concept VARCHAR(100),                     -- Khái niệm
    difficulty difficulty_level NOT NULL,     -- Độ khó
    acceptance_rate DECIMAL(5,2),            -- Tỷ lệ AC
    popularity BIGINT,                        -- Độ phổ biến
    solved BOOLEAN DEFAULT FALSE,             -- Đã giải chưa
    notes TEXT,                               -- Ghi chú
    leetcode_link TEXT,                       -- Link LeetCode
    solution TEXT,                            -- Lời giải
    similar_problems BIGINT[] DEFAULT '{}',   -- Bài tương tự
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. Tạo Review và Tracking Tables
```sql
-- Lịch sử ôn tập
CREATE TABLE review_history (...);

-- Các lần thử
CREATE TABLE review_attempts (...);

-- Pattern ôn tập (spaced repetition)
CREATE TABLE review_patterns (...);

-- Lỗi sai
CREATE TABLE mistakes (...);
```

#### 8. Tạo Indexes (Tối Ưu Performance)
```sql
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_solved ON problems(solved);
CREATE INDEX idx_problems_problem_id ON problems(problem_id);
CREATE INDEX idx_problems_similar_problems ON problems USING GIN(similar_problems);
-- ... (nhiều indexes khác)
```

#### 9. Insert Dữ Liệu Mặc Định

**Review Patterns:**
```sql
INSERT INTO review_patterns (difficulty, pattern, description) VALUES 
('easy', ARRAY[0, 1, 3, 7, 14, 30], 'Standard spaced repetition for easy problems'),
('medium', ARRAY[0, 1, 2, 4, 8, 16, 32], 'Accelerated pattern for medium problems'),
('hard', ARRAY[0, 1, 2, 4, 6, 10, 20, 40], 'Extended pattern for hard problems');
```

**Concepts (10 concepts):**
```sql
INSERT INTO concepts (concept_id, name) VALUES 
('two-pointers', 'Two Pointers'),
('sliding-window', 'Sliding Window'),
('binary-search', 'Binary Search'),
-- ... (7 concepts khác)
```

**Techniques (10 techniques):**
```sql
INSERT INTO techniques (name, description) VALUES 
('Fast and Slow Pointers', 'Use two pointers moving at different speeds'),
('Left and Right Pointers', 'Use pointers from both ends moving towards center'),
-- ... (8 techniques khác)
```

**Goals (10 goals):**
```sql
INSERT INTO goals (name, description) VALUES 
('Find Target', 'Locate a specific element or value'),
('Optimize Path', 'Find shortest or optimal path'),
-- ... (8 goals khác)
```

**Template Basics (3 templates):**
```sql
INSERT INTO template_basics (description, template_code) VALUES 
('Two Pointers Template', 'def two_pointers(arr): ...'),
('Sliding Window Template', 'def sliding_window(arr, k): ...'),
('Binary Search Template', 'def binary_search(arr, target): ...');
```

#### 10. Tạo Functions và Triggers

**Update Timestamp Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ language 'plpgsql';
```

**Trigger:**
```sql
CREATE TRIGGER update_problems_updated_at 
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Helper Functions:**
- `get_due_problems_today()` - Lấy bài cần ôn hôm nay
- `add_review_session()` - Thêm session ôn tập
- `process_review_session()` - Xử lý session với tracking lỗi

#### 11. Tạo Views

```sql
-- View bài cần ôn hôm nay
CREATE OR REPLACE VIEW due_problems_today AS
SELECT * FROM get_due_problems_today();

-- View thống kê bài tập
CREATE OR REPLACE VIEW problem_stats AS ...

-- View phân tích lỗi
CREATE OR REPLACE VIEW mistake_analysis AS ...
```

### Kết Quả Giai Đoạn 2

Database đã có:
- ✅ 13 tables chính
- ✅ 3 ENUM types
- ✅ 20+ indexes
- ✅ 3 review patterns
- ✅ 10 concepts
- ✅ 10 techniques
- ✅ 10 goals
- ✅ 3 template basics
- ✅ 3 helper functions
- ✅ 3 views
- ✅ 1 trigger

**Nhưng bảng `problems` vẫn TRỐNG!**

---

## 📥 Giai Đoạn 3: Import Dữ Liệu Từ CSV

### Bước 3.1: Chuẩn Bị File CSV

**File:** `leetcode_comprehensive.csv`

**Cấu trúc:**
```csv
problem_id,title,concept,difficulty,acceptance_rate,popularity,leetcode_link
1,Two Sum,Hash Table,Easy,49.5,1,https://leetcode.com/problems/two-sum/
2,Add Two Numbers,Linked List,Medium,42.3,2,https://leetcode.com/problems/add-two-numbers/
...
```

**Thống kê:**
- Tổng số dòng: ~1406 (1 header + 1405 problems)
- Các cột: 7 cột

### Bước 3.2: Chạy Import Script

**Lệnh:**
```bash
# Từ bên ngoài container
docker exec -it leetcode-app node server/scripts/importProblems.js

# Hoặc từ trong container
node server/scripts/importProblems.js
```

### Bước 3.3: Quá Trình Import Chi Tiết

#### 1. Đọc File CSV
```javascript
const csvPath = path.join(__dirname, '../../leetcode_comprehensive.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n');
```

**Output:**
```
📂 Reading CSV file...
📊 Headers: problem_id,title,concept,difficulty,acceptance_rate,popularity,leetcode_link
📝 Total lines: 1405
```

#### 2. Parse Headers
```javascript
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
```

#### 3. Loop Qua Từng Dòng
```javascript
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue; // Bỏ qua dòng trống
  
  // Parse values
  const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
  
  // Tạo object từ headers và values
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] || '';
  });
```

#### 4. Insert Vào Database
```javascript
await pool.query(`
  INSERT INTO problems (
    problem_id, 
    title, 
    concept, 
    difficulty, 
    acceptance_rate, 
    popularity, 
    leetcode_link
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
`, [
  parseInt(row.problem_id) || null,
  row.title || '',
  row.concept || '',
  row.difficulty || 'Medium',
  parseFloat(row.acceptance_rate) || null,
  parseInt(row.popularity) || null,
  row.leetcode_link || ''
]);
```

**Xử lý:**
- Parse `problem_id` thành integer
- Parse `acceptance_rate` thành float
- Parse `popularity` thành integer
- Giữ nguyên string cho `title`, `concept`, `difficulty`, `leetcode_link`
- Sử dụng parameterized query ($1, $2, ...) để tránh SQL injection

#### 5. Progress Tracking
```javascript
imported++;

if (imported % 100 === 0) {
  console.log(`✅ Imported ${imported} problems...`);
}
```

**Output:**
```
✅ Imported 100 problems...
✅ Imported 200 problems...
✅ Imported 300 problems...
...
✅ Imported 1400 problems...
```

#### 6. Error Handling
```javascript
try {
  await pool.query(...);
  imported++;
} catch (err) {
  failed++;
  if (failed <= 5) {
    console.error(`❌ Failed to import: ${row.title}`, err.message);
  }
}
```

**Lý do lỗi có thể xảy ra:**
- Duplicate `problem_id` (UNIQUE constraint)
- Invalid data type
- NULL constraint violation
- Foreign key constraint (nếu có)

#### 7. Kết Quả Cuối Cùng
```javascript
console.log(`\n🎉 Import complete!`);
console.log(`✅ Successfully imported: ${imported} problems`);
console.log(`❌ Failed: ${failed} problems`);
```

**Output:**
```
🎉 Import complete!
✅ Successfully imported: 1405 problems
❌ Failed: 0 problems
```

---

## 🔍 Kiểm Tra Kết Quả

### Kiểm Tra Số Lượng Problems

```bash
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice -c "SELECT COUNT(*) FROM problems;"
```

**Output:**
```
 count 
-------
  1405
(1 row)
```

### Kiểm Tra Một Số Problems

```bash
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice -c "SELECT problem_id, title, difficulty FROM problems LIMIT 5;"
```

**Output:**
```
 problem_id |        title        | difficulty 
------------+---------------------+------------
          1 | Two Sum             | easy
          2 | Add Two Numbers     | medium
          3 | Longest Substring   | medium
          4 | Median of Two       | hard
          5 | Longest Palindrome  | medium
```

### Kiểm Tra Thống Kê Theo Độ Khó

```bash
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice -c "SELECT difficulty, COUNT(*) FROM problems GROUP BY difficulty;"
```

**Output:**
```
 difficulty | count 
------------+-------
 easy       |   XXX
 medium     |   XXX
 hard       |   XXX
```

---

## 📊 Tóm Tắt Toàn Bộ Quá Trình

```
┌─────────────────────────────────────────────────────────────┐
│ 1. KHỞI ĐỘNG DOCKER COMPOSE                                │
│    docker-compose up -d                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. KIỂM TRA VOLUME                                          │
│    Volume mới? → Chạy init scripts                          │
│    Volume cũ?  → Bỏ qua init scripts (GIỮ DỮ LIỆU)        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CHẠY comprehensive-schema.sql (Nếu volume mới)          │
│    ├─ DROP tables cũ                                        │
│    ├─ CREATE ENUM types                                     │
│    ├─ CREATE 13 tables                                      │
│    ├─ CREATE 20+ indexes                                    │
│    ├─ INSERT default data (concepts, techniques, etc.)      │
│    ├─ CREATE functions & triggers                           │
│    └─ CREATE views                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DATABASE SẴN SÀNG (Nhưng problems table trống)          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CHẠY IMPORT SCRIPT                                       │
│    node server/scripts/importProblems.js                    │
│    ├─ Đọc leetcode_comprehensive.csv                        │
│    ├─ Parse 1405 dòng                                       │
│    ├─ INSERT từng problem vào database                      │
│    └─ Report kết quả                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. HOÀN TẤT                                                 │
│    Database có đầy đủ:                                      │
│    ✅ Schema structure                                       │
│    ✅ Default data                                           │
│    ✅ 1405 problems từ CSV                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Khi Nào Schema Được Chạy Lại?

Schema **CHỈ** chạy lại khi:
- Volume `postgres_data` bị xóa: `docker-compose down -v`
- Volume bị xóa thủ công: `docker volume rm leetcodepractice_postgres_data`
- Tạo volume mới với tên khác

### 2. Khi Nào Cần Import Lại CSV?

Import lại khi:
- Schema vừa được chạy lại (database mới)
- Muốn thêm problems mới từ CSV mới
- Muốn update thông tin problems

### 3. Dữ Liệu Thủ Công Có Bị Mất Không?

**KHÔNG** - Nếu bạn:
- Chỉ dùng `docker-compose down` (không có `-v`)
- Chỉ restart containers
- Chỉ rebuild app (không động vào postgres)

**CÓ** - Nếu bạn:
- Dùng `docker-compose down -v`
- Xóa volume thủ công
- Chạy lại schema với DROP TABLE

### 4. Làm Sao Để Backup?

```bash
# Backup toàn bộ database
docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > backup_$(date +%Y%m%d).sql

# Restore từ backup
docker exec -i leetcode-postgres psql -U leetcodeuser leetcodepractice < backup_20241116.sql
```

---

## 🎯 Kết Luận

Quá trình khởi tạo database từ CSV là một quy trình 3 bước:
1. **Docker tạo PostgreSQL container** với volume persistence
2. **Schema được tạo tự động** (chỉ lần đầu) với structure và default data
3. **CSV được import thủ công** để thêm 1405 problems

Hiểu rõ quá trình này giúp bạn:
- Tránh mất dữ liệu không mong muốn
- Biết khi nào cần import lại
- Debug khi có vấn đề
- Backup/restore đúng cách
