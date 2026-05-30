import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200',
  {
    variants: {
      variant: {
        default:     'bg-brand-100 text-brand-800 border border-brand-200',
        secondary:   'bg-[#e8edf0] text-[#4a5c63] border border-[#c8d4d8]',
        success:     'bg-green-100 text-green-800 border border-green-200 shadow-[0_0_6px_rgba(46,160,67,0.20)]',
        warning:     'bg-amber-100 text-amber-800 border border-amber-200',
        destructive: 'bg-red-100 text-red-800 border border-red-200',
        outline:     'border border-[var(--silver-200)] text-gray-700 bg-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
