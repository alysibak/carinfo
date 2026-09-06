import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarageStore } from '../stores/garageStore';
import { LoadingScreen } from '../components/ui';
import { usePageMeta } from '../utils/pageMeta';

/**
 * Battle Mode used a composite “winner” score — that fights the product thesis.
 * Send people to honest Compare instead (with garage cars when available).
 */
export default function BattleMode() {
  usePageMeta('Compare', 'Redirecting to side-by-side compare.');
  const garage = useGarageStore((s) => s.cars);
  const navigate = useNavigate();

  useEffect(() => {
    const ids = garage.slice(0, 5).map((c) => c.id);
    navigate(ids.length >= 2 ? `/compare?cars=${ids.join(',')}` : '/compare', { replace: true });
  }, [garage, navigate]);

  return <LoadingScreen label="Opening compare" />;
}
