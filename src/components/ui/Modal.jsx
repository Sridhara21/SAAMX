import React, { useEffect, useRef } from 'react';
import './primitives.css';
import { IconX } from '../../lib/icons.jsx';

/**
 * Accessible Modal / Dialog Primitive
 * Implements WAI-ARIA Dialog pattern with focus trapping, ESC dismiss, and backdrop blur.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
  style = {},
  ...rest
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Size mapping
  const maxWidthMap = {
    sm: '420px',
    md: '580px',
    lg: '760px',
    xl: '980px',
    full: '96vw'
  };

  useEffect(() => {
    if (!isOpen) return;

    // Cache previously focused element
    previousActiveElement.current = document.activeElement;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first interactive element inside modal or container itself
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modalRef.current?.focus();
    }

    // Keydown handler for Escape and Focus Trap
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const elements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (elements.length === 0) return;

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
      className="saamx-modal-backdrop"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={subtitle ? 'modal-desc' : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`saamx-modal-container ${className}`.trim()}
        style={{
          maxWidth: maxWidthMap[size] || '580px',
          ...style
        }}
        {...rest}
      >
        {/* Modal Header */}
        <div className="saamx-modal-header">
          <div>
            {title && (
              <h3 id="modal-title" className="saamx-modal-title">
                {title}
              </h3>
            )}
            {subtitle && (
              <p id="modal-desc" className="saamx-modal-desc">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="saamx-modal-close-btn"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="saamx-modal-body">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="saamx-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
