'use client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '@/app/providers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ProductivityChart({ data }) {
  const { dark } = useTheme();

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-56 text-zinc-400 text-sm">
        No data yet — upload files to get started.
      </div>
    );
  }

  const labels = data.map((d) => `W${d.week_number} '${String(d.year).slice(2)}`);
  const scores = data.map((d) => d.avg_score ?? 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Avg Productivity (%)',
        data: scores,
        backgroundColor: 'rgba(59,130,246,0.80)',
        borderColor: 'rgb(59,130,246)',
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const gridColor  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const tickColor  = dark ? '#71717a' : '#a1a1aa';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.raw.toFixed(1)}%` },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: gridColor },
        ticks: { color: tickColor, callback: (v) => `${v}%` },
      },
      x: {
        grid: { display: false },
        ticks: { color: tickColor },
      },
    },
  };

  return (
    <div className="relative h-56">
      <Bar data={chartData} options={options} />
    </div>
  );
}
