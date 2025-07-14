/**
/* © 2024 University of Cambridge. All rights reserved.  
**/
import { useState, useEffect } from 'react';
// @ts-ignore
import * as pedigreejsModule from "./pedigreejs.es.v3.0.0-rc8";
const { pedigreejs, pedigreejs_zooming, pedigreejs_pedcache, pedigreejs_io, pedigreejs_utils } = pedigreejsModule;
import { PersonEditDialog, PedigreeControls } from './components';

// Type definitions
interface PersonData {
	id: string;
	name?: string;
	display_name?: string;
	sex: 'M' | 'F' | 'U';
	isTarget?: boolean;
	fatherId?: string | null;
	motherId?: string | null;
	age?: number | null;
	yearOfBirth?: number | null;
	isDead?: boolean;
	isMonozygoticTwin?: boolean;
	isDizygoticTwin?: boolean;
	diseases?: Record<string, number>;
	geneticTests?: Record<string, string>;
	isAshkenazi?: boolean;
}

interface DiseaseConfig {
	type: string;
	colour: string;
}

interface PedigreeOptions {
	targetDiv: string;
	btn_target: string;
	width: number;
	height: number;
	symbol_size: number;
	font_size: string;
	edit: boolean;
	showWidgets: boolean;
	zoomIn: number;
	zoomOut: number;
	zoomSrc: string[];
	labels: string[][];
	diseases: DiseaseConfig[];
	DEBUG: boolean;
	onPersonEdit: (person: any) => void;
	dataset?: any;
}

// Person class to represent individuals in the pedigree
class Person {
	id: string;
	name: string;
	sex: 'M' | 'F' | 'U';
	isTarget: boolean;
	fatherId: string | null;
	motherId: string | null;
	age: number | null;
	yearOfBirth: number | null;
	isDead: boolean;
	isMonozygoticTwin: boolean;
	isDizygoticTwin: boolean;
	diseases: Record<string, number>;
	geneticTests: Record<string, string>;
	isAshkenazi: boolean;

	constructor({
		id,
		name,
		sex,
		isTarget = false,
		fatherId = null,
		motherId = null,
		age = null,
		yearOfBirth = null,
		isDead = false,
		isMonozygoticTwin = false,
		isDizygoticTwin = false,
		diseases = {},
		geneticTests = {},
		isAshkenazi = false
	}: PersonData) {
		console.log("Creating Person:", id, isTarget, name);
		this.id = id;
		this.name = name || '';
		this.sex = sex;
		this.isTarget = isTarget;
		this.fatherId = fatherId;
		this.motherId = motherId;
		this.age = age;
		this.yearOfBirth = yearOfBirth;
		this.isDead = isDead;
		this.isMonozygoticTwin = isMonozygoticTwin;
		this.isDizygoticTwin = isDizygoticTwin;
		this.diseases = diseases;
		this.geneticTests = geneticTests;
		this.isAshkenazi = isAshkenazi;
	}

	// Convert to CanRisk format for PedigreeJS
	toCanRiskFormat(familyId: string = 'XFAM'): string {
		const data = {
			familyId: familyId,
			target: this.isTarget ? 1 : 0,
			name: this.name,
			fatherId: this.fatherId || 0,
			motherId: this.motherId || 0,
			sex: this.sex,
			mzTwin: this.isMonozygoticTwin ? 1 : 0,
			dead: this.isDead ? 1 : 0,
			age: this.age || 0,
			yob: this.yearOfBirth || 0,
			bc1: this.diseases.breast_cancer || 0,
			bc2: this.diseases.breast_cancer2 || 0,
			oc: this.diseases.ovarian_cancer || 0,
			pro: this.diseases.prostate_cancer || 0,
			pan: this.diseases.pancreatic_cancer || 0,
			ashkn: this.isAshkenazi ? 1 : 0,
			brca1: this.formatGeneticTest('BRCA1'),
			brca2: this.formatGeneticTest('BRCA2'),
			palb2: this.formatGeneticTest('PALB2'),
			atm: this.formatGeneticTest('ATM'),
			chek2: this.formatGeneticTest('CHEK2'),
			bard1: this.formatGeneticTest('BARD1'),
			rad51d: this.formatGeneticTest('RAD51D'),
			rad51c: this.formatGeneticTest('RAD51C'),
			brip1: this.formatGeneticTest('BRIP1'),
			pathology: '0:0:0:0:0' // Pathology results (ER:PR:HER2:CK14:CK56)
		};
		console.log("Converting to CanRisk format:", data);
		const rawData = [
			data.familyId,    // FamID
			data.name,        // Name (display name)
			data.target,      // Target (proband flag)
			this.id,          // IndivID (unique individual ID) - use ID not name!
			data.fatherId,    // FathID
			data.motherId,    // MothID
			data.sex,         // Sex
			data.mzTwin,      // MZtwin
			data.dead,        // Dead
			data.age,         // Age
			data.yob,
			data.bc1,
			data.bc2,
			data.oc,
			data.pro,
			data.pan,
			data.ashkn,
			data.brca1,
			data.brca2,
			data.palb2,
			data.atm,
			data.chek2,
			data.bard1,
			data.rad51d,
			data.rad51c,
			data.brip1,
			data.pathology
		];
		console.log("Raw CanRisk data:", rawData);
		return rawData.join('\t');
	}

	formatGeneticTest(testName: string): string {
		const result = this.geneticTests[testName];
		if (!result) return '0:0';
		
		switch(result.toUpperCase()) {
			case 'P': return '1:0'; // Positive
			case 'N': return '0:1'; // Negative
			default: return '0:0';  // Unknown
		}
	}
}

const createFamilyData = (): Person[] => {
	return [
		new Person({
			id: 'parent1',
			// name: 'Patricia',
			sex: 'F',
			// age: 55,
			// diseases: { breast_cancer: 53 }
		}),
		new Person({
			id: 'parent2',
			// name: 'Tony',
			sex: 'M',
			// age: 60
		}),
		new Person({
			id: '123',
			name: 'Proband',
			sex: 'M',
			// age: 55,
			// yearOfBirth: 1970,
			fatherId: 'parent2',
			motherId: 'parent1',
			isTarget: true
		}),
	];
};

// Convert family data to CanRisk format
const generateCanRiskData = (familyData: Person[]): string => {
	const header = "##CanRisk 3.0\n##FamID\tName\tTarget\tIndivID\tFathID\tMothID\tSex\tMZtwin\tDead\tAge\tYob\tBC1\tBC2\tOC\tPRO\tPAN\tAshkn\tBRCA1\tBRCA2\tPALB2\tATM\tCHEK2\tBARD1\tRAD51D\tRAD51C\tBRIP1\tER:PR:HER2:CK14:CK56";
	const rows = familyData.map(person => person.toCanRiskFormat()).join('\n');
	const canRiskData = `${header}\n${rows}`;
	console.log("Generated CanRisk data:\n", canRiskData);
	return canRiskData;
};

export const PedigreeJS = (): JSX.Element => {
	const [dialogOpen, setDialogOpen] = useState<boolean>(false);
	const [selectedPerson, setSelectedPerson] = useState<any>(null);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);

	const w = window.innerWidth;
	const h = window.innerHeight;
	const opts: PedigreeOptions = {
		'targetDiv': 'pedigreejs',
		'btn_target': 'pedigree_history',
		'width': (w > 1800 ? 1700: w - 50),
		'height': h*1.0,
		'symbol_size': 30,
		'font_size': '.75em',
		'edit': true,
		'showWidgets': true, // Keep widgets for node interactions
		'zoomIn': .5,
		'zoomOut': 3.0,
		'zoomSrc':  ['wheel', 'button'] ,
		'labels': [['age', 'yob']],
		'diseases': [	{'type': 'breast_cancer', 'colour': '#F68F35'},
						{'type': 'breast_cancer2', 'colour': 'pink'},
						{'type': 'ovarian_cancer', 'colour': '#4DAA4D'},
						{'type': 'pancreatic_cancer', 'colour': '#4289BA'},
						{'type': 'prostate_cancer', 'colour': '#D5494A'}],
		'DEBUG': false,
		'onPersonEdit': (person: any) => {
			setSelectedPerson(person);
			setDialogOpen(true);
		}
	};

	useEffect(() => {
		// Store the edit handler globally so pedigreejs can access it
		(window as any).reactEditHandler = opts.onPersonEdit;
		
		// Expose pedigreejs functions globally for the React controls
		(window as any).pedigreejs = pedigreejs;
		(window as any).pedigreejs_zooming = pedigreejs_zooming;
		(window as any).pedigreejs_pedcache = pedigreejs_pedcache;
		(window as any).pedigreejs_io = pedigreejs_io;
		(window as any).pedigreejs_utils = pedigreejs_utils;
		
		// Ensure D3 is available globally (it should be available from pedigreejs)
		if (typeof (window as any).d3 === 'undefined' && typeof (window as any).d3 !== 'undefined') {
			(window as any).d3 = (window as any).d3;
		}
		
		// Listen for validation errors and rollback events
		const handleValidationError = (error: any, opts?: any) => {
			console.log('Validation error received:', error);
			
			// Extract the actual error message from the error object
			let errorMessage = '';
			if (error && typeof error === 'object') {
				// The error might be the first argument, or it might be nested
				if (error.message) {
					errorMessage = error.message;
				} else if (error.toString && error.toString() !== '[object Object]') {
					errorMessage = error.toString();
				} else {
					// Try to find the error message in the arguments
					errorMessage = 'Validation failed. Please check your pedigree data.';
				}
			} else if (typeof error === 'string') {
				errorMessage = error;
			} else {
				errorMessage = 'Validation failed. Please check your pedigree data.';
			}
			
			// If we still don't have a meaningful message, try to extract from console logs
			if (errorMessage === 'Validation failed. Please check your pedigree data.' && error) {
				console.log('Full error object for debugging:', error);
				// Try to get the actual error message from the pedigreejs error
				if (error.target && error.target.textContent) {
					errorMessage = error.target.textContent;
				}
			}
			
			setValidationError(errorMessage);
			
			// Auto-clear validation error after 5 seconds
			setTimeout(() => {
				setValidationError(null);
			}, 5000);
		};
		
		const handleRollbackSuccess = (opts: any) => {
			console.log('Rollback completed successfully');
			setRollbackMessage('Pedigree restored to previous state');
			
			// Auto-clear rollback message after 3 seconds
			setTimeout(() => {
				setRollbackMessage(null);
			}, 3000);
		};
		
		// Ensure jQuery is available and wait for it to be loaded
		const checkJQuery = () => {
			if (typeof (window as any).$ !== 'undefined' && typeof (window as any).$.fn.dialog !== 'undefined') {
				// Add event listeners for validation and rollback
				(window as any).$(document).on('validation_error', handleValidationError);
				(window as any).$(document).on('rollback_success', handleRollbackSuccess);
				
				showPedigree(opts);
			} else {
				setTimeout(checkJQuery, 100);
			}
		};
		checkJQuery();
		
		// Cleanup function
		return () => {
			if (typeof (window as any).$ !== 'undefined') {
				(window as any).$(document).off('validation_error', handleValidationError);
				(window as any).$(document).off('rollback_success', handleRollbackSuccess);
			}
		};
	}, []);

	const local_dataset = pedigreejs_pedcache.current(opts);
	if (local_dataset !== undefined && local_dataset !== null) {
		opts.dataset = local_dataset;
	} else {
		// Create family data using Person class
		const familyData = createFamilyData();
		const generatedCanRiskData = generateCanRiskData(familyData);
		console.log("Generated CanRisk data for pedigreejs:");
		console.log(generatedCanRiskData);
		
		try {
			pedigreejs_io.load_data(generatedCanRiskData, opts);
			console.log("Data loaded successfully");
			console.log("Opts dataset after load_data:");
			console.log(JSON.stringify(opts.dataset, null, 2));
			
			// Check each person's parent relationships
			opts.dataset?.forEach((person: any, index: number) => {
				console.log(`Person ${index}:`, {
					name: person.name,
					father: person.father,
					mother: person.mother,
					hasParentNode: 'parent_node' in person,
					parentNodeCount: person.parent_node ? person.parent_node.length : 0
				});
			});
		} catch (error) {
			console.error("Error loading pedigreejs data:", error);
		}
	}

	return (
		<>
			<div id="pedigree_history" className="p-2"></div>
			<div key="tree" id="pedigree"></div>
			{/* Legacy node properties div - hidden but still needed for some functionality */}
			<div id="node_properties" title="Edit Details" style={{display: 'none'}}></div>
			
			{/* React-based Pedigree Controls */}
			<PedigreeControls opts={opts} />
			
			{/* Validation error notification */}
			{validationError && (
				<div style={{
					position: 'fixed',
					top: '20px',
					right: '20px',
					background: '#f8d7da',
					border: '1px solid #f5c6cb',
					borderRadius: '5px',
					padding: '15px',
					boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
					zIndex: 10000,
					maxWidth: '400px',
					color: '#721c24'
				}}>
					<strong>⚠️ Validation Error:</strong><br/>
					{validationError}
				</div>
			)}
			
			{/* Rollback success notification */}
			{rollbackMessage && (
				<div style={{
					position: 'fixed',
					top: '20px',
					right: '20px',
					background: '#d4edda',
					border: '1px solid #c3e6cb',
					borderRadius: '5px',
					padding: '15px',
					boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
					zIndex: 10000,
					maxWidth: '400px',
					color: '#155724'
				}}>
					<strong>✅ Success:</strong><br/>
					{rollbackMessage}
				</div>
			)}
			
			{/* React Dialog */}
			<PersonEditDialog
				isOpen={dialogOpen}
				onClose={() => setDialogOpen(false)}
				person={selectedPerson}
				diseases={opts.diseases}
				onSave={(updatedData: any) => {
					console.log("Saving person data:", updatedData);
					
					// Find the person in the dataset and update their data
					if (selectedPerson && opts.dataset) {
						const personIndex = opts.dataset.findIndex((p: any) => p.name === selectedPerson.data.name);
						if (personIndex !== -1) {
							// Backup the original data before making changes
							const originalData = { ...opts.dataset[personIndex] };
							
							// Filter out properties that shouldn't be updated (internal pedigreejs properties)
							const disallowed = ["id", "name", "parent_node", "children", "parent", "depth", "height", "x", "y"];
							const filteredData: any = {};
							for (const key in updatedData) {
								if (disallowed.indexOf(key) === -1) {
									filteredData[key] = updatedData[key];
								}
							}
							
							// Update the person's data in the dataset, preserving internal properties
							opts.dataset[personIndex] = {
								...opts.dataset[personIndex],
								...filteredData
							};
							
							console.log("Updated person in dataset:", opts.dataset[personIndex]);
							
							// Trigger pedigree rebuild to reflect changes (this will also update the cache)
							if (typeof (window as any).$ !== 'undefined') {
								// Listen for validation errors and rollback if needed
								const handleValidationError = (error: any, errorOpts?: any) => {
									console.log('Validation failed, rolling back changes');
									
									// Safely restore original data using the correct opts reference
									if (opts.dataset && personIndex >= 0 && personIndex < opts.dataset.length) {
										opts.dataset[personIndex] = originalData;
										console.log('Restored original data:', originalData);
									}
									
									// Remove the event listener first
									((window as any).$ as any)(document).off('validation_error', handleValidationError);
									
									// Ensure dataset is valid before rebuilding
									if (!opts.dataset || !Array.isArray(opts.dataset)) {
										console.error('Dataset is invalid after rollback, cannot rebuild');
										return;
									}
									
									// Trigger rebuild with original data after a short delay to ensure cleanup
									setTimeout(() => {
										try {
											console.log('Triggering rebuild with restored data');
											((window as any).$ as any)(document).trigger('rebuild', [opts]);
										} catch (rebuildError) {
											console.error('Failed to trigger rebuild after rollback:', rebuildError);
										}
									}, 100);
								};
								
								// Add temporary validation error listener
								((window as any).$ as any)(document).one('validation_error', handleValidationError);
								
								// Trigger rebuild
								((window as any).$ as any)(document).trigger('rebuild', [opts]);
							} else {
								// Fallback if jQuery is not available
								try {
									pedigreejs.rebuild(opts);
								} catch (error) {
									console.error('Rebuild failed, rolling back changes');
									// Safely restore original data
									if (opts.dataset && personIndex >= 0 && personIndex < opts.dataset.length) {
										opts.dataset[personIndex] = originalData;
										console.log('Restored original data (fallback):', originalData);
									}
									// Try rebuild again with original data
									try {
										console.log('Triggering fallback rebuild with restored data');
										pedigreejs.rebuild(opts);
									} catch (rebuildError) {
										console.error('Failed to rebuild after rollback:', rebuildError);
									}
								}
							}
						} else {
							console.error("Person not found in dataset for update");
						}
					}
					
					setDialogOpen(false);
				}}
				validationError={validationError}
			/>
		</>
	);
};

/** Show pedigreejs **/
const showPedigree = (opts: PedigreeOptions): void => {
	const p = document.getElementById("pedigreejs");
	const ped = document.getElementById("pedigree");
	if(!p && ped){
		const p = document.createElement('div');
		p.id = 'pedigreejs';
		ped.appendChild(p); 
		pedigreejs_load(opts);
	}
	const refresh = document.getElementsByClassName("fa-refresh");
	if(refresh) (refresh[0] as HTMLElement).style.display = "none";
}

const pedigreejs_load = (opts: PedigreeOptions): void => {
	try {
		pedigreejs.rebuild(opts);
		// Only try scaling if rebuild was successful
		try {
			pedigreejs_zooming.scale_to_fit(opts);
		} catch (scalingError) {
			console.warn("Scaling failed, but pedigree should still be visible:", scalingError);
		}
	} catch(e) {
		let msg: string;
		if (typeof e === "string") {
			msg = e.toUpperCase();
		} else if (e instanceof Error) {
			msg = e.message;
		} else {
			msg = "Unknown error occurred";
		}
		console.error("PedigreeJS load error: " + msg, e);
		
		// Don't re-throw - the rebuild function should have handled displaying the error
		// If no error display was shown, add a fallback
		const targetDiv = opts && opts.targetDiv ? opts.targetDiv : 'pedigree_edit';
		const targetElement = document.getElementById(targetDiv);
		if (targetElement && !targetElement.innerHTML.trim()) {
			targetElement.innerHTML = `
				<div style="padding:20px;color:#721c24;background:#f8d7da;border:1px solid #f5c6cb;margin:10px;border-radius:5px;font-family:Arial,sans-serif;">
					<strong>⚠️ Failed to Load Pedigree:</strong><br>
					<div style="margin-top:8px;">${msg}</div>
				</div>
			`;
		}
	}
}; 