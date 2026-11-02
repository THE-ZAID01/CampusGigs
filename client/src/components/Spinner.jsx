export default function Spinner({ full }) {
  return (
    <div className={full ? 'full-loading' : 'loading'}>
      <div className="spinner" role="progressbar" aria-label="Loading" />
    </div>
  );
}
