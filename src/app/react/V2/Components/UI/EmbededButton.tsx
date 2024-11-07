import React, { MouseEventHandler } from 'react';

interface ButtonProps {
  children: string | React.ReactNode;
  type?: 'submit' | 'button';
  color?: 'orange' | 'green' | 'red' | 'indigo' | 'white';
  disabled?: boolean;
  form?: string;
  onClick?: MouseEventHandler;
  className?: string;
  icon?: React.ReactNode;
  collapsed?: boolean;
}

const EmbededButton = ({
  color = 'white',
  children,
  type = 'button',
  disabled,
  form,
  onClick,
  icon,
  collapsed,
  className = '',
}: ButtonProps) => {
  let buttonColor = 'green';
  let childrenBaseStyle = 'text-sm';

  switch (color) {
    case 'orange':
      buttonColor = 'text-orange-600 bg-orange-50';
      break;
    case 'green':
      buttonColor =
        'text-green-400 bg-green-100 border-green-200 disabled:text-green-200 disabled:bg-green-50 disabled:border-green-200';
      break;
    case 'red':
      buttonColor = 'bg-gray-50';
      childrenBaseStyle = 'text-gray-300';
      break;
    case 'indigo':
      buttonColor =
        'text-indigo-800 bg-indigo-200 border-indigo-300 disabled:text-indigo-200 disabled:bg-indigo-50 disabled:border-indigo-200';
      break;
    case 'white':
      buttonColor = 'bg-white border-gray-200 disabled:text-gray-300 disabled:bg-gray-50';
      break;
    default:
      buttonColor = '';
  }

  if (collapsed) {
    childrenBaseStyle = 'sr-only';
  }

  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled}
      className={`${className} ${buttonColor} ${collapsed || disabled ? '' : 'border'} px-2 py-[2px] text-xs disabled:cursor-not-allowed font-medium rounded-[4px] focus:outline-none`}
      form={form}
    >
      <div className="flex flex-row gap-1 justify-center items-center">
        <div className="w-3 h-3 text-sm">{icon}</div>
        <div className={childrenBaseStyle}>{children}</div>
      </div>
    </button>
  );
};

export { EmbededButton };
