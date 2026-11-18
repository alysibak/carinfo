import ShareButton from './ShareButton';

/**
 * Hands a VIN result to someone else. The link reopens the same car (the VIN
 * page reads ?vin=).
 */
export default function ShareResult({ vin, title }: { vin: string; title: string }) {
  return (
    <ShareButton
      url={`${window.location.origin}/vin?vin=${encodeURIComponent(vin)}`}
      title={title}
      className="btn-secondary text-sm"
    />
  );
}
