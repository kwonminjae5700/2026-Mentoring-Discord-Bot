import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { DateTime } from 'luxon';
import { ZONE } from '../time.js';

// 번들 폰트가 있으면 등록(이식성), 없으면 시스템에 설치된 Pretendard/Apple SD Gothic Neo 사용.
const __dirname = dirname(fileURLToPath(import.meta.url));
for (const [file, name] of [
  ['Pretendard-Regular.ttf', 'Pretendard'],
  ['Pretendard-SemiBold.ttf', 'Pretendard'],
  ['Pretendard-Bold.ttf', 'Pretendard'],
]) {
  const p = join(__dirname, '..', '..', 'assets', 'fonts', file);
  if (existsSync(p)) GlobalFonts.registerFromPath(p, name);
}

const FAMILY = '"Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FAMILY}`;

const C = {
  page: '#F2F4F6',
  card: '#FFFFFF',
  title: '#191F28',
  caption: '#3182F6',
  brand: '#3182F6',
  day: '#4E5968',
  sun: '#F04452',
  sat: '#3182F6',
  faint: '#C4CAD1',
  legend: '#8B95A1',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// availMap: Map<'YYYY-MM-DD', count>, todayStr: 'YYYY-MM-DD'
export function renderCalendarPng(year, month, availMap, todayStr) {
  const first = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
  const daysInMonth = first.daysInMonth;
  const lead = first.weekday % 7; // 일요일 시작
  const rows = Math.ceil((lead + daysInMonth) / 7);

  // 논리 좌표 (2배 스케일로 렌더)
  const W = 460;
  const left = 36;
  const right = W - 36;
  const colW = (right - left) / 7;
  const weekdayY = 130;
  const dayTop = 168;
  const cellH = 52;
  const R = 18;
  const gridBottom = dayTop + rows * cellH;
  const legendY = gridBottom + 6;
  const H = legendY + 40;

  const S = 2;
  const canvas = createCanvas(W * S, H * S);
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 배경
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, W, H);

  // 카드 + 부드러운 그림자
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.06)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = C.card;
  roundRect(ctx, 16, 16, W - 32, H - 32, 24);
  ctx.fill();
  ctx.restore();

  // 헤더
  ctx.textAlign = 'left';
  ctx.fillStyle = C.caption;
  ctx.font = font(600, 15);
  ctx.fillText('멘토링 캘린더', left, 58);
  ctx.fillStyle = C.title;
  ctx.font = font('bold', 30);
  ctx.fillText(`${year}년 ${month}월`, left, 92);
  ctx.textAlign = 'center';

  // 요일 행
  ctx.font = font(600, 14);
  for (let c = 0; c < 7; c++) {
    ctx.fillStyle = c === 0 ? C.sun : c === 6 ? C.sat : C.legend;
    ctx.fillText(WEEKDAYS[c], left + colW * (c + 0.5), weekdayY);
  }

  // 날짜
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = lead + d - 1;
    const c = idx % 7;
    const r = Math.floor(idx / 7);
    const cx = left + colW * (c + 0.5);
    const cy = dayTop + r * cellH + cellH / 2;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const available = (availMap.get(dateStr) || 0) > 0;
    const isToday = dateStr === todayStr;
    const isPastDay = dateStr < todayStr;

    if (available) {
      // 예약 가능 — 토스 블루 원 + 흰 숫자
      ctx.fillStyle = C.brand;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      if (isToday) {
        ctx.strokeStyle = 'rgba(49,130,246,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font('bold', 16);
      ctx.fillText(String(d), cx, cy + 1);
    } else {
      if (isToday) {
        ctx.strokeStyle = C.brand;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.brand;
      } else if (isPastDay) {
        ctx.fillStyle = C.faint;
      } else {
        ctx.fillStyle = c === 0 ? C.sun : c === 6 ? C.sat : C.day;
      }
      ctx.font = font(500, 16);
      ctx.fillText(String(d), cx, cy + 1);
    }
  }

  // 범례
  ctx.textAlign = 'left';
  const ly = legendY + 16;
  ctx.fillStyle = C.brand;
  ctx.beginPath();
  ctx.arc(left + 6, ly, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.legend;
  ctx.font = font(500, 13);
  ctx.fillText('예약 가능한 날', left + 20, ly + 1);

  return canvas.toBuffer('image/png');
}
