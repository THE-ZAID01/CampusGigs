export const num = (n) => Number(n || 0).toLocaleString('en-IN');

export const dateShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

export function ago(d) {
  const s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return dateShort(d);
}

export const daysLeft = (deadline) => {
  if (!deadline) return null;
  const d = Math.ceil((new Date(deadline + 'T23:59:59') - Date.now()) / 86400000);
  return d;
};

export const STATUS_LABEL = {
  open: 'Open for bids',
  in_progress: 'In progress',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn',
};
