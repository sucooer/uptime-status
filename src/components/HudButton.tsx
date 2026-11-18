import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type HudButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

export function HudButton({ className, type = 'button', ...rest }: HudButtonProps) {
  return (
    <button
      type={type}
      className={cn('ctl', className)}
      {...rest}
    />
  );
}
