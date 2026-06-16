import { getBodyTypeImage } from '../utils/carImages';

interface BodyTypeIllustrationProps {
  bodyType: string;
  className?: string;
}

/** Body-type silhouette from the browse taxonomy artwork (inverted for dark UI). */
export default function BodyTypeIllustration({ bodyType, className = '' }: BodyTypeIllustrationProps) {
  const src = getBodyTypeImage(bodyType);
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`object-contain object-center invert opacity-90 ${className}`}
    />
  );
}
