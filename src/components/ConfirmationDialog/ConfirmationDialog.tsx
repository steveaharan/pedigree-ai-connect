/**
 * Reusable confirmation dialog component
 * © 2024 University of Cambridge. All rights reserved.
 */
import React from 'react';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
	isOpen: boolean;
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	type?: 'warning' | 'danger' | 'info';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
	isOpen, 
	title = 'Confirm Action', 
	message, 
	confirmText = 'Confirm', 
	cancelText = 'Cancel',
	onConfirm, 
	onCancel,
	type = 'warning' // 'warning', 'danger', 'info'
}) => {
	if (!isOpen) return null;

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Escape') {
			onCancel();
		} else if (e.key === 'Enter') {
			onConfirm();
		}
	};

	return (
		<div 
			className="confirmation-overlay" 
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
			tabIndex={-1}
		>
			<div className={`confirmation-dialog ${type}`}>
				<div className="confirmation-header">
					<h3 className="confirmation-title">{title}</h3>
				</div>
				
				<div className="confirmation-content">
					<p className="confirmation-message">{message}</p>
				</div>
				
				<div className="confirmation-actions">
					<button
						className="confirmation-button cancel-button"
						onClick={onCancel}
						autoFocus
					>
						{cancelText}
					</button>
					<button
						className={`confirmation-button confirm-button ${type}-confirm`}
						onClick={onConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationDialog; 