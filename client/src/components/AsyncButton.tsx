import React, { useState, useCallback, forwardRef, memo } from 'react';

export interface AsyncButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  loadingText?: React.ReactNode;
  loadingIcon?: React.ReactNode;
  isLoading?: boolean;
}

const AsyncButton = memo(forwardRef<HTMLButtonElement, AsyncButtonProps>(({
  children,
  onClick,
  disabled,
  loadingText,
  loadingIcon,
  isLoading: externalIsLoading,
  className = '',
  ...props
}, ref) => {
  const [internalIsPending, setInternalIsPending] = useState(false);

  const isPending = externalIsLoading !== undefined ? externalIsLoading : internalIsPending;

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || isPending || disabled) return;

      setInternalIsPending(true);
      try {
        await onClick(e);
      } finally {
        setInternalIsPending(false);
      }
    },
    [onClick, isPending, disabled]
  );

  const defaultSpinner = (
    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      ref={ref}
      onClick={handleClick}
      disabled={isPending || disabled}
      className={`relative inline-flex items-center justify-center transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden ${className}`}
      {...props}
    >
      <span className={`flex items-center gap-2 ${isPending && loadingText ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
        {children}
      </span>
      {isPending && loadingText && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="flex items-center gap-2">
            {loadingIcon || defaultSpinner}
            {loadingText}
          </span>
        </span>
      )}
      {isPending && !loadingText && (
         <span className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 dark:bg-white/10">
            {loadingIcon || defaultSpinner}
         </span>
      )}
    </button>
  );
}));

AsyncButton.displayName = 'AsyncButton';

export default AsyncButton;
