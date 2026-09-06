import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy VehicleGrid deep links map into Search with one-per-model on.
 */
export default function VehicleGrid() {
  const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
  const params = new URLSearchParams();

  const sub = (subcategory ?? '').toLowerCase().replace(/_/g, '-');
  const cat = (category ?? '').toLowerCase();

  if (cat === 'body-style' || cat === 'body') {
    params.set('body', sub);
  } else if (cat === 'fuel' || cat === 'fuel-type') {
    params.set('fuel', sub);
  } else if (cat === 'brand' || cat === 'make') {
    params.set('make', subcategory ?? '');
  } else if (sub) {
    params.set('q', subcategory.replace(/-/g, ' '));
    params.set('sort', 'relevance');
  }

  const qs = params.toString();
  return <Navigate to={qs ? `/home?${qs}` : '/home'} replace />;
}
