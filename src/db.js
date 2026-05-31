import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { now } from './time.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'mentoring.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS slots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id        INTEGER NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
    mentee_id      TEXT NOT NULL,
    mentee_name    TEXT NOT NULL,
    message        TEXT,
    message_at     TEXT,
    reminder_sent  INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
  );
`);

// ── 매핑 헬퍼 ──────────────────────────────────────────────
function mapSlotRow(r) {
  if (!r) return null;
  return {
    id: r.slot_id,
    date: r.date,
    start_time: r.start_time,
    end_time: r.end_time,
    booking: r.booking_id
      ? {
          id: r.booking_id,
          mentee_id: r.mentee_id,
          mentee_name: r.mentee_name,
          message: r.message,
          message_at: r.message_at,
          reminder_sent: r.reminder_sent,
        }
      : null,
  };
}

const SLOT_SELECT = `
  SELECT s.id AS slot_id, s.date, s.start_time, s.end_time,
         b.id AS booking_id, b.mentee_id, b.mentee_name,
         b.message, b.message_at, b.reminder_sent
  FROM slots s
  LEFT JOIN bookings b ON b.slot_id = s.id
`;

// ── 슬롯 ───────────────────────────────────────────────────
export function addSlot(date, startTime, endTime) {
  const info = db
    .prepare('INSERT INTO slots (date, start_time, end_time, created_at) VALUES (?, ?, ?, ?)')
    .run(date, startTime, endTime, now().toISO());
  return info.lastInsertRowid;
}

export function deleteSlot(id) {
  return db.prepare('DELETE FROM slots WHERE id = ?').run(id).changes > 0;
}

export function getSlot(id) {
  const row = db.prepare(`${SLOT_SELECT} WHERE s.id = ?`).get(id);
  return mapSlotRow(row);
}

export function getAllSlots() {
  return db
    .prepare(`${SLOT_SELECT} ORDER BY s.date, s.start_time`)
    .all()
    .map(mapSlotRow);
}

export function getSlotsForDate(date) {
  return db
    .prepare(`${SLOT_SELECT} WHERE s.date = ? ORDER BY s.start_time`)
    .all(date)
    .map(mapSlotRow);
}

// ── 예약 ───────────────────────────────────────────────────
// 동시 클릭 시에도 slot_id UNIQUE 로 한 명만 성공. 실패하면 null 반환.
export function createBooking(slotId, menteeId, menteeName) {
  try {
    const info = db
      .prepare(
        'INSERT INTO bookings (slot_id, mentee_id, mentee_name, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(slotId, menteeId, menteeName, now().toISO());
    return info.lastInsertRowid;
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return null;
    throw err;
  }
}

const BOOKING_SELECT = `
  SELECT b.id AS booking_id, b.slot_id, b.mentee_id, b.mentee_name,
         b.message, b.message_at, b.reminder_sent,
         s.date, s.start_time, s.end_time
  FROM bookings b
  JOIN slots s ON s.id = b.slot_id
`;

function mapBookingRow(r) {
  if (!r) return null;
  return {
    id: r.booking_id,
    slot_id: r.slot_id,
    mentee_id: r.mentee_id,
    mentee_name: r.mentee_name,
    message: r.message,
    message_at: r.message_at,
    reminder_sent: r.reminder_sent,
    slot: { id: r.slot_id, date: r.date, start_time: r.start_time, end_time: r.end_time },
  };
}

export function getBooking(id) {
  return mapBookingRow(db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id));
}

export function getBookingsByMentee(menteeId) {
  return db
    .prepare(`${BOOKING_SELECT} WHERE b.mentee_id = ? ORDER BY s.date, s.start_time`)
    .all(menteeId)
    .map(mapBookingRow);
}

export function getAllBookings() {
  return db
    .prepare(`${BOOKING_SELECT} ORDER BY s.date, s.start_time`)
    .all()
    .map(mapBookingRow);
}

export function cancelBooking(bookingId, menteeId) {
  // menteeId 가 주어지면 본인 예약만 취소 (안전장치)
  const sql = menteeId
    ? 'DELETE FROM bookings WHERE id = ? AND mentee_id = ?'
    : 'DELETE FROM bookings WHERE id = ?';
  const args = menteeId ? [bookingId, menteeId] : [bookingId];
  return db.prepare(sql).run(...args).changes > 0;
}

export function setBookingMessage(bookingId, message) {
  return (
    db
      .prepare('UPDATE bookings SET message = ?, message_at = ? WHERE id = ?')
      .run(message, now().toISO(), bookingId).changes > 0
  );
}

export function markReminderSent(bookingId) {
  return (
    db.prepare('UPDATE bookings SET reminder_sent = 1 WHERE id = ?').run(bookingId).changes > 0
  );
}

// 메시지 미작성 + 아직 재촉 안 한 예약들 (24시간 판정은 호출부에서)
export function getBookingsAwaitingMessage() {
  return db
    .prepare(`${BOOKING_SELECT} WHERE b.message IS NULL AND b.reminder_sent = 0`)
    .all()
    .map(mapBookingRow);
}

export default db;
