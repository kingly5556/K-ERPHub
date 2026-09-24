# คู่มือระบบ Stock & Purchase Order

โมดูลนี้แยกเป็น 2 repo คือ `Stock-Purchase-Backend` และ `Stock-Purchase-Frontend` (วางเป็นโฟลเดอร์พี่น้องกันใน `K-ERP/Stock and purchase/`) เป็นระบบจัดการสต็อกสินค้ากับคำสั่งซื้อ (Purchase Order) ที่เสียบเข้ากับ ERPHUB (ระบบ auth hub หลักของ K-ERP) เอกสารนี้อธิบายว่า **มีอะไรอยู่บ้าง, ทำไมถึงออกแบบแบบนี้, และใช้งานยังไง** — ไม่ใช่ reference โค้ดแบบละเอียด (ดูโค้ดจริงที่ path ด้านล่างสำหรับรายละเอียด)

---

## 1. ทำไมถึงมีโมดูลนี้

K-ERP คือ **ERPHUB** — ระบบ auth เดียวที่รวมโมดูล ERP ย่อยๆ หลายตัวไว้ด้วยกัน (path-based: `/erp/{key}/...`) โมดูลนี้คือโมดูลแรกที่สร้างขึ้นมาทดสอบสถาปัตยกรรมนี้จริง โดยเลือกโดเมน "จัดการสต็อก + คำสั่งซื้อ" เพราะ:

- เป็นโดเมนธุรกิจที่มี business logic จริงจัง ไม่ใช่แค่ CRUD (multi-step approval, partial receiving, audit trail) — เหมาะกับการโชว์ทักษะ backend design
- พิสูจน์ได้ว่าสถาปัตยกรรม "โมดูลแยกอิสระ + ยืม auth จาก ERPHUB" ใช้งานได้จริงกับระบบที่มี state/DB ของตัวเอง ไม่ใช่แค่ demo echo service

---

## 2. ภาพรวมสถาปัตยกรรม

```
ผู้ใช้ → login ที่ ERPHUB (/erphub)
       → ได้ JWT เก็บใน cookie (httpOnly)
       → คลิกเมนู "Stock & Purchase Orders"
       → ERPHUB proxy ส่ง request ไปที่ backend ของโมดูลนี้
         พร้อมแนบ Authorization: Bearer <jwt> ให้อัตโนมัติ
       → โมดูลนี้ตรวจสอบ JWT เอง (ใช้ secret เดียวกับ ERPHUB) แล้วตอบกลับ
```

**หลักการสำคัญ: โมดูลนี้ไม่มีระบบ login เป็นของตัวเอง** ไม่มีหน้า sign-in, ไม่มีตาราง user/password ไม่เก็บ session — เชื่อ JWT ที่ ERPHUB เซ็นมาให้เท่านั้น ถ้าไม่มี token หรือ token ปลอม จะโดนปฏิเสธทันที (401)

ข้อดีของการออกแบบแบบนี้: ต่อไปถ้าจะเพิ่มโมดูล ERP อื่น (เช่น บัญชี, HR) ก็ไม่ต้องสร้างระบบ login ใหม่ทุกครั้ง ใช้ pattern เดียวกันได้เลย

---

## 3. ประกอบด้วยอะไรบ้าง (โครงสร้างไฟล์)

```
K-ERP/
├── K-ERPHub/                     ← ERPHUB (auth hub + proxy) — repo นี้
└── Stock and purchase/           ← โมดูลนี้ (ระบบอื่นๆ ในอนาคตจะมีโฟลเดอร์ของตัวเองแบบเดียวกัน)
    ├── Stock-Purchase-Backend/   ← REST API (Express + Prisma + PostgreSQL)
    │   ├── AGENTS.md             ← สเปกและกฎธุรกิจทั้งหมดของโมดูลนี้ (ต้นทางความจริง)
    │   ├── prisma/schema.prisma  ← โครงสร้างฐานข้อมูลทั้งหมด
    │   ├── prisma/seed.ts        ← ข้อมูลตัวอย่างสำหรับ demo
    │   └── src/modules/          ← โค้ดแยกตามโดเมนธุรกิจ (ดูข้อ 5)
    └── Stock-Purchase-Frontend/  ← หน้าเว็บ (React + TypeScript + Vite)
        └── src/pages/            ← หน้าจอต่างๆ (ดูข้อ 6)
```

---

## 4. ฐานข้อมูล — เก็บอะไรบ้าง และทำไม

Schema เต็มอยู่ที่ `backend/prisma/schema.prisma`

| ตาราง | เก็บอะไร | ทำไมออกแบบแบบนี้ |
|---|---|---|
| `Product` | สินค้า (SKU, ชื่อ, หน่วย, ต้นทุน, reorder point/qty) | ข้อมูลหลักของสต็อก |
| `Supplier` | ซัพพลายเออร์ | |
| `PurchaseOrder` | หัวใบสั่งซื้อ (เลขที่, สถานะ, ยอดรวม, คนสร้าง/อนุมัติ) | แยกจาก line item เพื่อให้ query สถานะ/รายการ PO ได้เร็ว |
| `PurchaseOrderLine` | รายการสินค้าในแต่ละ PO (สั่งเท่าไหร่ vs รับแล้วเท่าไหร่) | เก็บ `qtyOrdered` แยกจาก `qtyReceived` เพื่อรองรับการรับของไม่ครบในครั้งเดียว |
| `GoodsReceipt` / `GoodsReceiptLine` | ใบรับของแต่ละครั้ง | 1 PO รับของได้หลายรอบ แต่ละรอบมีบันทึกแยก ตรวจสอบย้อนหลังได้ว่าใครรับ เมื่อไหร่ เท่าไหร่ |
| **`StockMovement`** | **ทุกการเปลี่ยนแปลงสต็อก (ledger)** | **ตารางที่สำคัญที่สุด** — ดูข้อ 4.1 |

### 4.1 ทำไม stock ถึงต้องเป็น "ledger" ไม่ใช่ "ตัวเลขที่แก้ตรงๆ"

ถ้าเก็บสต็อกเป็นตัวเลขเดียวแล้ว UPDATE ทุกครั้งที่มีการรับ/เบิกของ ปัญหาคือ:
- ถ้ามี 2 คนรับของพร้อมกัน ตัวเลขอาจจะเพี้ยน (race condition)
- ตรวจสอบย้อนหลังไม่ได้ว่าทำไมตัวเลขถึงเป็นแบบนี้ (ไม่มี audit trail)

โมดูลนี้เลยใช้ **append-only ledger**: ทุกการเปลี่ยนแปลงสต็อก (รับของ, ปรับปรุง) จะ **insert แถวใหม่เข้า `StockMovement` เท่านั้น ห้าม UPDATE/DELETE เด็ดขาด** แล้วยอดคงเหลือ (balance) จะคำนวณจากการรวมยอดทุกแถวเสมอ (ดูโค้ดที่ `backend/src/modules/inventory/inventory.service.ts` ฟังก์ชัน `postStockMovement`) — วิธีนี้ทำให้:
- ตรวจสอบย้อนหลังได้ 100% ว่าสต็อกเปลี่ยนเพราะอะไร เมื่อไหร่ ใครทำ
- ป้องกัน race condition ด้วยการ lock แถวสินค้า (`SELECT ... FOR UPDATE`) ตอนคำนวณ balance ก่อน insert

---

## 5. Backend — โครงสร้างและ business rule สำคัญ

อยู่ที่ `backend/src/modules/` แบ่งตามโดเมน (แต่ละโดเมนห้ามไปยุ่งตารางของโดเมนอื่นตรงๆ ต้องเรียกผ่าน service — กฎนี้เขียนไว้ใน AGENTS.md เพื่อกันไม่ให้ logic ปนกันมั่ว):

| โมดูลย่อย | หน้าที่ |
|---|---|
| `auth/` | ตรวจ JWT เท่านั้น (verify-only) — **ไม่มี login** |
| `product/`, `supplier/` | CRUD ข้อมูลหลัก |
| `inventory/` | คำนวณ balance, บันทึก ledger, แจ้งเตือนสินค้าใกล้หมด |
| `purchase-order/` | สร้าง/อนุมัติ/ส่ง/ยกเลิก PO ตาม state machine |
| `goods-receipt/` | รับของเข้า PO (เต็มหรือบางส่วน) |
| `reporting/` | stock card (ประวัติการเคลื่อนไหวของสินค้าแต่ละตัว) |

### 5.1 สถานะของ PO (state machine)

```
DRAFT → PENDING_APPROVAL → APPROVED → SENT → PARTIALLY_RECEIVED → COMPLETED
  ↓            ↓               ↓        ↓
CANCELLED  CANCELLED       CANCELLED CANCELLED
```

เปลี่ยนสถานะข้ามขั้นไม่ได้ (เช่น DRAFT กระโดดไป SENT เลยไม่ได้) — บังคับด้วยโค้ดที่ `purchase-order/po-status.ts` ไม่ใช่แค่ตรวจฝั่ง UI

### 5.2 กฎ Approval threshold

PO ที่ยอดรวมเกิน **50,000 บาท** (ปรับได้ผ่าน env `APPROVAL_THRESHOLD_SATANG`) ต้องผ่านการอนุมัติจาก Manager ก่อนถึงจะ "ส่ง" ได้ — ถ้าต่ำกว่านั้นระบบอนุมัติให้อัตโนมัติ จำลองการควบคุมภายในของธุรกิจจริง

### 5.3 การรับของบางส่วน (partial receipt)

1 PO รับของได้หลายรอบ ระบบเช็คไม่ให้รับเกินจำนวนที่สั่ง และ PO จะเปลี่ยนเป็น "รับครบแล้ว" (COMPLETED) ก็ต่อเมื่อทุกรายการในนั้นรับครบจริง

---

## 6. Frontend — หน้าจอที่มี

React SPA ธรรมดา (ไม่มี framework หนักๆ) — served มาจาก backend ตัวเดียวกัน (ไม่ต้องมี server แยก):

| หน้า | ทำอะไร |
|---|---|
| Dashboard | รายการสินค้าที่ balance ต่ำกว่า/เท่ากับจุดสั่งซื้อซ้ำ |
| Products / Suppliers | ดูและเพิ่มข้อมูลหลัก |
| Purchase Orders | รายการ PO ทั้งหมด, สร้างใหม่, ดูรายละเอียด, กดปุ่ม submit/approve/send/cancel ตามสถานะ, ฟอร์มรับของ |
| Stock card | ประวัติการเคลื่อนไหวสต็อกของสินค้าแต่ละตัว (ledger แบบเห็นภาพ) |

**หมายเหตุการออกแบบ**: หน้าเว็บไม่ได้ซ่อนปุ่มตาม role ของผู้ใช้ (เพราะ frontend อ่าน role จาก JWT ที่อยู่ใน cookie แบบ httpOnly ไม่ได้) ปล่อยให้ backend เป็นคนตัดสินและตอบกลับ error ถ้าไม่มีสิทธิ์แทน — เป็นการตัดสินใจที่ตั้งใจ ไม่ใช่ทำไม่ครบ

---

## 7. สิ่งที่ทดสอบไปแล้วจริง (ไม่ใช่แค่ทฤษฎี)

- รัน migration + seed กับ PostgreSQL จริง (ไม่ใช่ mock)
- ยิง API จริงผ่าน curl: รับของบางส่วน → balance ขยับถูกต้อง, พยายามรับเกินจำนวนสั่ง → ระบบบล็อกถูกต้อง
- เปิดเบราว์เซอร์จริง กรอกฟอร์มรับของผ่าน UI จริง → เห็นข้อมูลอัปเดตถูกต้อง
- ล็อกอินที่ ERPHUB จริง (`admin` / `ChangeMe123!`) → คลิกเมนู → เข้าโมดูลนี้ได้โดยไม่ต้อง login ซ้ำ → พิสูจน์ว่า auth flow ทำงานจริงทั้งระบบ ไม่ใช่แค่ทฤษฎีในเอกสาร

---

## 8. สิ่งที่ยังไม่เสร็จ

- **ยังไม่ได้ deploy ที่ไหน** — รันได้แค่บนเครื่องนี้ (localhost)
- **ยังไม่มี integration test สำหรับ concurrency** (2 คนรับของพร้อมกันจริงๆ) — ตัว lock มีอยู่ในโค้ดแล้วแต่ยังไม่มี automated test ยืนยัน
- **ยังไม่มี ER diagram / Swagger docs** ตามที่ AGENTS.md ตั้งเป้าไว้สำหรับใช้เป็นพอร์ตโฟลิโอ
- Role-based UI (ซ่อนปุ่มตามสิทธิ์) — ตั้งใจไม่ทำตามที่อธิบายในข้อ 6

---

## 9. วิธีรันระบบทั้งหมด (ย่อ)

ต้องรัน 3 อย่างพร้อมกัน:

```bash
# 1. ฐานข้อมูล
docker start k-erp-stock-pg

# 2. Frontend build (ครั้งเดียวพอ ถ้าไม่ได้แก้โค้ด)
cd "Stock and purchase/Stock-Purchase-Frontend"
npm run build

# 3. Backend ของโมดูล (พอร์ต 4001)
cd ../Stock-Purchase-Backend
npm run dev

# 4. ERPHUB ตัวหลัก (พอร์ต 3000)
cd ../../K-ERPHub
npm run dev
```

แล้วเข้า `http://localhost:3000/erphub/login` (admin / ChangeMe123!) → คลิก "Stock & Purchase Orders"

รายละเอียดคำสั่ง/troubleshooting เต็มๆ อยู่ที่ `Stock-Purchase-Backend/README.md`
