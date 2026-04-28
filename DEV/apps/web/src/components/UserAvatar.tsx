import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getAvatarColor, getPersonInitials, splitName } from '@/lib/avatar';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeConfig: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: 'h-6 w-6 text-[10px]', text: 'text-[10px]' },
  sm: { container: 'h-8 w-8 text-xs', text: 'text-xs' },
  md: { container: 'h-9 w-9 text-sm', text: 'text-sm' },
  lg: { container: 'h-24 w-24 text-2xl', text: 'text-2xl' },
  xl: { container: 'h-14 w-14 text-lg', text: 'text-lg' },
};

const failedAvatarSrc = new Set<string>();

interface IUserAvatarProps {
  src?: string | null;
  firstName?: string;
  surname?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

export function UserAvatar({ src, firstName, surname, name, size = 'md', className }: IUserAvatarProps) {
  const [imgError, setImgError] = useState(() => Boolean(src && failedAvatarSrc.has(src)));

  useEffect(() => {
    setImgError(Boolean(src && failedAvatarSrc.has(src)));
  }, [src]);

  const normalized = splitName(name);
  const safeFirstName = (firstName ?? normalized.firstName).trim();
  const safeSurname = (surname ?? normalized.surname).trim();
  const displayName = [safeFirstName, safeSurname].filter(Boolean).join(' ').trim() || name?.trim() || 'Unknown';

  const { container } = sizeConfig[size];
  const initials = getPersonInitials({ firstName: safeFirstName, surname: safeSurname, name: displayName });
  const bgColor = getAvatarColor(displayName);

  if (src && !imgError) {
    return (
      <div className={cn('rounded-full overflow-hidden flex-shrink-0', container, className)}>
        <img
          src={src}
          alt={displayName}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (src) failedAvatarSrc.add(src);
            setImgError(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold',
        container,
        bgColor,
        className,
      )}
    >
      <span>{initials}</span>
    </div>
  );
}
