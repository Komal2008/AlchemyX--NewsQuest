import { Suspense } from 'react';
import { getAvatarOption, getAvatarModel3D } from '@/data/avatars';
import { Avatar3DViewer } from './Avatar3DViewer';

interface AvatarVisualProps {
  avatarId?: number | null;
  className?: string;
  imageClassName?: string;
  show3D?: boolean;
}

export const AvatarVisual = ({ avatarId, className = '', imageClassName = '', show3D = false }: AvatarVisualProps) => {
  const avatar = getAvatarOption(avatarId);
  const model3d = show3D ? getAvatarModel3D(avatarId) : undefined;

  if (model3d) {
    return (
      <Suspense fallback={<span className={`leading-none select-none ${className}`}>{avatar.emoji}</span>}>
        <Avatar3DViewer 
          src={model3d} 
          autoRotate 
          interactive={false}
          className={className || imageClassName}
        />
      </Suspense>
    );
  }

  if (avatar.kind === 'image' && avatar.src) {
    return (
      <img
        src={avatar.src}
        alt={avatar.name}
        draggable={false}
        className={`block select-none object-contain ${className} ${imageClassName}`}
      />
    );
  }

  return <span className={`leading-none select-none ${className}`}>{avatar.emoji}</span>;
};
