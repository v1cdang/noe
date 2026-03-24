'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { MoodHistoryPoint } from '@/lib/journaling/types';

type MoodTrendChartProps = {
  points: MoodHistoryPoint[];
};

function formatDateTick(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MoodTrendChart({
  points
}: Readonly<MoodTrendChartProps>): React.ReactElement {
  const data = points.map((p) => ({ ...p, label: formatDateTick(p.date) }));

  return (
    <div className="cardBlock">
      <h2 className="sectionTitle">Mood trend</h2>
      <div className="chartWrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.10)" strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: 'rgba(232,235,240,0.75)' }} interval="preserveStartEnd" />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fill: 'rgba(232,235,240,0.75)' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.14)' }}
              labelStyle={{ color: 'rgba(232,235,240,0.9)' }}
              formatter={(value) => [
                typeof value === 'number' ? value.toFixed(2) : '-',
                'Avg mood'
              ]}
            />
            <Line type="monotone" dataKey="averageScore" stroke="rgba(77,214,255,0.95)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {points.length === 0 ? <p className="mutedText">No mood entries yet. Come back after your first journal.</p> : null}
    </div>
  );
}

