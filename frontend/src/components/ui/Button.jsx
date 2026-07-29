import React from 'react';

const VARIANTS = {
  primary: 'btn-primary',
  ghost: 'btn-secondary',
  danger: 'btn-danger',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`${VARIANTS[variant] || VARIANTS.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
