/**
 * React component to replace legacy pedigree controls
 * Replaces the jQuery-based button system in pedigreejs
 * © 2024 University of Cambridge. All rights reserved.
 */
import React, { useState, useEffect } from 'react';
import './PedigreeControls.css';
import ConfirmationDialog from '../ConfirmationDialog';

const PedigreeControls = ({ opts }) => {
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);
	const [zoomLevel, setZoomLevel] = useState(1);
	const [isVisible, setIsVisible] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	
	// Load position from localStorage or use default
	const [position, setPosition] = useState(() => {
		try {
			const savedPosition = localStorage.getItem('pedigree-controls-position');
			if (savedPosition) {
				const parsedPosition = JSON.parse(savedPosition);
				// Validate the position is reasonable
				if (parsedPosition.x >= 0 && parsedPosition.y >= 0) {
					return parsedPosition;
				}
			}
		} catch (error) {
			console.warn('Failed to load saved control position:', error);
		}
		return { x: 20, y: 20 }; // Default position
	});

	useEffect(() => {
		// Check for dependencies
		const checkAvailability = () => {
			if (typeof window.$ === 'undefined' || !window.pedigreejs_zooming) {
				setTimeout(checkAvailability, 100);
				return;
			}

			// Update control states
			const updateStates = () => {
				try {
					updateZoomLevel();
					updateUndoRedoStates();
					updateFullscreenState();
				} catch (error) {
					console.warn('Could not update control states:', error);
				}
			};

			// Listen for pedigree events
			window.$(document).on('rebuild', updateStates);
			window.$(document).on('build', updateStates);
			window.$(document).on('fhChange', updateStates);
			
			// Listen for fullscreen changes
			const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
			fullscreenEvents.forEach(event => {
				document.addEventListener(event, updateFullscreenState);
			});
			
			// Keyboard shortcuts
			const handleKeyboard = (e) => {
				if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
				
				if (e.ctrlKey || e.metaKey) {
					switch(e.key) {
						case 'z':
							if (e.shiftKey) {
								e.preventDefault();
								handleRedo();
							} else {
								e.preventDefault();
								handleUndo();
							}
							break;
						case 'y':
							e.preventDefault();
							handleRedo();
							break;
						case '=':
						case '+':
							e.preventDefault();
							handleZoomIn();
							break;
						case '-':
							e.preventDefault();
							handleZoomOut();
							break;
						case '0':
							e.preventDefault();
							handleZoomFit();
							break;
					}
				}
			};
			
			document.addEventListener('keydown', handleKeyboard);
			
			// Zoom level polling
			const zoomInterval = setInterval(updateZoomLevel, 500);
			
			// Initial update
			setTimeout(updateStates, 500);

			// Cleanup
			return () => {
				if (typeof window.$ !== 'undefined') {
					window.$(document).off('rebuild', updateStates);
					window.$(document).off('build', updateStates);
					window.$(document).off('fhChange', updateStates);
				}
				fullscreenEvents.forEach(event => {
					document.removeEventListener(event, updateFullscreenState);
				});
				document.removeEventListener('keydown', handleKeyboard);
				clearInterval(zoomInterval);
			};
		};

		const cleanup = checkAvailability();
		return cleanup;
	}, [opts]);

	const updateZoomLevel = () => {
		try {
			const svg = window.d3?.select(`#${opts.targetDiv} svg`);
			if (svg && !svg.empty()) {
				const zoomTransform = window.d3.zoomTransform(svg.node());
				if (zoomTransform) {
					setZoomLevel(zoomTransform.k);
				}
			}
		} catch (error) {
			// Ignore zoom level errors
		}
	};

	const updateUndoRedoStates = () => {
		try {
			if (window.pedigreejs_pedcache && opts) {
				const current = window.pedigreejs_pedcache.get_count(opts);
				const nstore = window.pedigreejs_pedcache.nstore(opts);
				
				setCanUndo(current > 1);
				setCanRedo(nstore > current);
			}
		} catch (error) {
			setCanUndo(false);
			setCanRedo(false);
		}
	};

	const updateFullscreenState = () => {
		const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || 
					   document.mozFullScreenElement || document.msFullscreenElement);
		setIsFullscreen(isFS);
	};

	// Control handlers - matching legacy behavior
	const handleUndo = () => {
		if (!canUndo) return;
		try {
			opts.dataset = window.pedigreejs_pedcache.previous(opts);
			window.$(`#${opts.targetDiv}`).empty();
			window.$(document).trigger('build', [opts]);
			window.$(document).trigger('fhChange', [opts]);
		} catch (error) {
			console.error('Undo failed:', error);
		}
	};

	const handleRedo = () => {
		if (!canRedo) return;
		try {
			opts.dataset = window.pedigreejs_pedcache.next(opts);
			window.$(`#${opts.targetDiv}`).empty();
			window.$(document).trigger('build', [opts]);
			window.$(document).trigger('fhChange', [opts]);
		} catch (error) {
			console.error('Redo failed:', error);
		}
	};

	const handleReset = () => {
		setShowResetConfirm(true);
	};

	const confirmReset = () => {
		try {
			console.log('confirmReset');
			// Implement reset functionality to restore to React app's initial state
			console.log('Resetting pedigree to initial state');
			
			// Create the React app's initial dataset (3-person family)
			// This matches what's created in PedigreeJS_fixed.jsx createFamilyData()
			// The 'name' field in pedigree dataset should match the ID, not the display name
			const initialDataset = [
				{"name": "parent1", "sex": "F", "top_level": true, "status": "0"},
				{"name": "parent2","sex": "M", "top_level": true, "status": "0"},
				{"name": "123", "display_name": "Proband", "sex": "M", "mother": "parent1", "father": "parent2", "proband": true, "status": "0"}
			];
			
			// Clear pedigree data from cache
			if (window.pedigreejs_pedcache && window.pedigreejs_pedcache.clear) {
				window.pedigreejs_pedcache.clear(opts);
			}
			
			// Set the new dataset
			opts.dataset = initialDataset;
			
			// Trigger rebuild
			if (window.$) {
				window.$(document).trigger('rebuild', [opts]);
			}
			
		} catch (error) {
			console.error('Reset failed:', error);
		}
		setShowResetConfirm(false);
	};

	const cancelReset = () => {
		setShowResetConfirm(false);
	};

	const handleZoomIn = () => {
		try {
			console.log('Zoom in clicked');
			console.log('pedigreejs_zooming available:', !!window.pedigreejs_zooming);
			console.log('btn_zoom available:', !!window.pedigreejs_zooming?.btn_zoom);
			console.log('opts:', opts);
			
			// Use the same approach as the legacy zoom buttons
			if (window.pedigreejs_zooming && window.pedigreejs_zooming.btn_zoom) {
				window.pedigreejs_zooming.btn_zoom(opts, 1.05); // Match legacy zoom factor
			} else {
				console.warn('pedigreejs_zooming.btn_zoom not available');
			}
		} catch (error) {
			console.error('Zoom in failed:', error);
		}
	};

	const handleZoomOut = () => {
		try {
			console.log('Zoom out clicked');
			console.log('pedigreejs_zooming available:', !!window.pedigreejs_zooming);
			console.log('btn_zoom available:', !!window.pedigreejs_zooming?.btn_zoom);
			
			// Use the same approach as the legacy zoom buttons
			if (window.pedigreejs_zooming && window.pedigreejs_zooming.btn_zoom) {
				window.pedigreejs_zooming.btn_zoom(opts, 0.95); // Match legacy zoom factor
			} else {
				console.warn('pedigreejs_zooming.btn_zoom not available');
			}
		} catch (error) {
			console.error('Zoom out failed:', error);
		}
	};

	const handleZoomFit = () => {
		try {
			if (window.pedigreejs_zooming && window.pedigreejs_zooming.scale_to_fit) {
				window.pedigreejs_zooming.scale_to_fit(opts);
			} else {
				console.warn('pedigreejs_zooming.scale_to_fit not available');
			}
		} catch (error) {
			console.error('Zoom fit failed:', error);
		}
	};

	const handleFullscreen = () => {
		try {
			const target = document.getElementById(opts.targetDiv);
			if (!isFullscreen) {
				if (target.requestFullscreen) {
					target.requestFullscreen();
				} else if (target.mozRequestFullScreen) {
					target.mozRequestFullScreen();
				} else if (target.webkitRequestFullscreen) {
					target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
				} else if (target.msRequestFullscreen) {
					target.msRequestFullscreen();
				}
			} else {
				if (document.exitFullscreen) {
					document.exitFullscreen();
				} else if (document.msExitFullscreen) {
					document.msExitFullscreen();
				} else if (document.mozCancelFullScreen) {
					document.mozCancelFullScreen();
				} else if (document.webkitExitFullscreen) {
					document.webkitExitFullscreen();
				}
			}
		} catch (error) {
			console.error('Fullscreen toggle failed:', error);
		}
	};

	const handleDownloadPNG = () => {
		try {
			// Trigger PNG download - this would need to be implemented
			console.log('PNG download requested');
			// Could integrate with existing download functionality
		} catch (error) {
			console.error('PNG download failed:', error);
		}
	};

	const toggleVisibility = () => {
		setIsVisible(!isVisible);
	};

	const resetPosition = () => {
		setPosition({ x: 20, y: 20 });
	};

	// Drag functionality
	const handleMouseDown = (e) => {
		if (e.target.closest('.control-button')) return; // Don't drag when clicking buttons
		
		setIsDragging(true);
		const rect = e.currentTarget.getBoundingClientRect();
		setDragOffset({
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		});
		e.preventDefault();
	};

	const handleMouseMove = (e) => {
		if (!isDragging) return;
		
		const newX = e.clientX - dragOffset.x;
		const newY = e.clientY - dragOffset.y;
		
		// Keep controls within viewport bounds
		const maxX = window.innerWidth - 220; // Approximate control width
		const maxY = window.innerHeight - 200; // Approximate control height
		
		setPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY))
		});
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	// Touch support for mobile devices
	const handleTouchStart = (e) => {
		if (e.target.closest('.control-button')) return;
		
		const touch = e.touches[0];
		setIsDragging(true);
		const rect = e.currentTarget.getBoundingClientRect();
		setDragOffset({
			x: touch.clientX - rect.left,
			y: touch.clientY - rect.top
		});
		e.preventDefault();
	};

	const handleTouchMove = (e) => {
		if (!isDragging) return;
		
		const touch = e.touches[0];
		const newX = touch.clientX - dragOffset.x;
		const newY = touch.clientY - dragOffset.y;
		
		// Keep controls within viewport bounds
		const maxX = window.innerWidth - 220;
		const maxY = window.innerHeight - 200;
		
		setPosition({
			x: Math.max(0, Math.min(newX, maxX)),
			y: Math.max(0, Math.min(newY, maxY))
		});
		e.preventDefault();
	};

	const handleTouchEnd = () => {
		setIsDragging(false);
	};

	// Add global mouse and touch event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.addEventListener('touchmove', handleTouchMove, { passive: false });
			document.addEventListener('touchend', handleTouchEnd);
			document.body.style.cursor = 'grabbing';
			document.body.style.userSelect = 'none';
		} else {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [isDragging, dragOffset]);

	// Save position to localStorage
	useEffect(() => {
		const savedPosition = localStorage.getItem('pedigree-controls-position');
		if (savedPosition) {
			try {
				const parsedPosition = JSON.parse(savedPosition);
				setPosition(parsedPosition);
			} catch (error) {
				console.warn('Failed to load saved control position:', error);
			}
		}
	}, []);

	useEffect(() => {
		localStorage.setItem('pedigree-controls-position', JSON.stringify(position));
	}, [position]);

	if (!isVisible) {
		return (
			<div 
				className="pedigree-controls minimized"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`
				}}
			>
				<button
					className="control-button expand-button"
					onClick={toggleVisibility}
					title="Show Controls"
				>
					<span className="control-icon">⚙️</span>
				</button>
			</div>
		);
	}

	return (
		<>
			<div 
				className={`pedigree-controls ${isDragging ? 'dragging' : ''}`}
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
					cursor: isDragging ? 'grabbing' : 'grab'
				}}
				onMouseDown={handleMouseDown}
				onTouchStart={handleTouchStart}
			>
				<div className="controls-header">
					<span 
						className="controls-title" 
						title="Use Ctrl+Z/Y for undo/redo, Ctrl+/- for zoom. Drag to move controls."
					>
						Pedigree Controls
					</span>
					<div className="header-buttons">
						<button
							className="control-button reset-position-button"
							onClick={resetPosition}
							title="Reset Position"
						>
							<span className="control-icon">📍</span>
						</button>
						<button
							className="control-button minimize-button"
							onClick={toggleVisibility}
							title="Hide Controls"
						>
							<span className="control-icon">−</span>
						</button>
					</div>
				</div>
				
				<div className="controls-section">
					{/* History Controls */}
					<div className="controls-group">
						<label className="controls-label">History</label>
						<div className="button-group">
							<button
								className={`control-button ${!canUndo ? 'disabled' : ''}`}
								onClick={handleUndo}
								disabled={!canUndo}
								title="Undo Last Change (Ctrl+Z / ⌘Z)"
							>
								<span className="control-icon">↶</span>
								<span className="control-text">Undo</span>
							</button>
							<button
								className={`control-button ${!canRedo ? 'disabled' : ''}`}
								onClick={handleRedo}
								disabled={!canRedo}
								title="Redo Last Change (Ctrl+Shift+Z / ⌘⇧Z)"
							>
								<span className="control-icon">↷</span>
								<span className="control-text">Redo</span>
							</button>
							<button
								className="control-button reset-button"
								onClick={handleReset}
								title="Reset Pedigree"
							>
								<span className="control-icon">🔄</span>
								<span className="control-text">Reset</span>
							</button>
						</div>
					</div>

					{/* Zoom Controls */}
					<div className="controls-group">
						<label className="controls-label">Zoom ({Math.round(zoomLevel * 100)}%)</label>
						<div className="button-group">
							<button
								className="control-button"
								onClick={handleZoomIn}
								title="Zoom In (Ctrl+Plus / ⌘+)"
							>
								<span className="control-icon">+</span>
							</button>
							<button
								className="control-button"
								onClick={handleZoomOut}
								title="Zoom Out (Ctrl+Minus / ⌘-)"
							>
								<span className="control-icon">−</span>
							</button>
							<button
								className="control-button"
								onClick={handleZoomFit}
								title="Fit to Screen (Ctrl+0 / ⌘0)"
							>
								<span className="control-icon">⊞</span>
								<span className="control-text">Fit</span>
							</button>
						</div>
					</div>

					{/* View Controls */}
					<div className="controls-group">
						<label className="controls-label">View</label>
						<div className="button-group">
							<button
								className="control-button"
								onClick={handleFullscreen}
								title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
							>
								<span className="control-icon">{isFullscreen ? '⇲' : '⇱'}</span>
								<span className="control-text">{isFullscreen ? 'Exit' : 'Full'}</span>
							</button>
							<button
								className="control-button"
								onClick={handleDownloadPNG}
								title="Download PNG Image"
							>
								<span className="control-icon">📷</span>
								<span className="control-text">PNG</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Reset Confirmation Dialog */}
			<ConfirmationDialog
				isOpen={showResetConfirm}
				title="Reset Pedigree"
				message="This will reset the pedigree to its initial state. Any unsaved changes will be lost. Are you sure you want to continue?"
				confirmText="Reset"
				cancelText="Cancel"
				type="warning"
				onConfirm={confirmReset}
				onCancel={cancelReset}
			/>
		</>
	);
};

export default PedigreeControls;
