import { Navigate, useParams } from 'react-router-dom';

/**
 * Legacy Explore routes redirect into Browse / Search — one discovery path.
 */
export default function Explore() {
  const { category } = useParams<{ category: string }>();

  if (category === 'body-style') return <Navigate to="/browse" replace />;
  if (category === 'brand') return <Navigate to="/browse" replace />;
  if (category === 'purpose') return <Navigate to="/browse" replace />;
  if (category === 'era') return <Navigate to="/browse" replace />;
  if (category === 'fuel') return <Navigate to="/home?fuel=electric" replace />;

  return <Navigate to="/browse" replace />;
}
