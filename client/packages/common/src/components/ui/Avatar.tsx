import React from 'react';
import clsx from 'clsx';

export interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'away' | 'busy';
    className?: string;
}

const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
};

const statusClasses = {
    online: 'bg-success',
    offline: 'bg-text-muted',
    away: 'bg-warning',
    busy: 'bg-error',
};

const gradients = [
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
    'from-cyan-500 to-blue-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
];

const getGradient = (name: string): string => {
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[index % gradients.length];
};

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt,
    name = '',
    size = 'md',
    status,
    className,
}) => {
    const [imageError, setImageError] = React.useState(false);
    const showImage = src && !imageError;
    const initials = getInitials(name);
    const gradient = getGradient(name);

    return (
        <div className={clsx('relative inline-flex', className)}>
            <div
                className={clsx(
                    'relative flex items-center justify-center rounded-full overflow-hidden',
                    'font-semibold text-white',
                    sizeClasses[size],
                    !showImage && `bg-gradient-to-br ${gradient}`
                )}
            >
                {showImage ? (
                    <img
                        src={src}
                        alt={alt || name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <span>{initials || '?'}</span>
                )}
            </div>

            {/* Status Indicator */}
            {status && (
                <span
                    className={clsx(
                        'absolute bottom-0 right-0 rounded-full ring-2 ring-surface',
                        statusClasses[status],
                        size === 'xs' && 'w-1.5 h-1.5',
                        size === 'sm' && 'w-2 h-2',
                        size === 'md' && 'w-2.5 h-2.5',
                        size === 'lg' && 'w-3 h-3',
                        size === 'xl' && 'w-4 h-4'
                    )}
                />
            )}
        </div>
    );
};

Avatar.displayName = 'Avatar';
