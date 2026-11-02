import { STATUS_LABEL } from '../utils/format.js';
export default function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{STATUS_LABEL[status] || status}</span>;
}
