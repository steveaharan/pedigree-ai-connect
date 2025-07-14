/**
/* © 2024 University of Cambridge. All rights reserved.  
**/
import React, { useState } from 'react';
import { pedigreejs, pedigreejs_zooming, pedigreejs_pedcache, pedigreejs_io, pedigreejs_utils } from "./pedigreejs.es.v3.0.0-rc8";
import { PersonEditDialog, PedigreeControls } from './components';

// Person class to represent individuals in the pedigree
class Person {
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
	}) {
		console.log("Creating Person:", id, isTarget, name);
		this.id = id;
		this.name = name;
		this.sex = sex; // 'M', 'F', or 'U'
		this.isTarget = isTarget;
		this.fatherId = fatherId;
		this.motherId = motherId;
		this.age = age;
		this.yearOfBirth = yearOfBirth;
		this.isDead = isDead;
		this.isMonozygoticTwin = isMonozygoticTwin;
		this.isDizygoticTwin = isDizygoticTwin;
		this.diseases = diseases; // { breast_cancer: 55, prostate_cancer: 71, etc. }
		this.geneticTests = geneticTests; // { BRCA1: 'N', BRCA2: 'P', etc. }
		this.isAshkenazi = isAshkenazi;
	}

	// Convert to CanRisk format for PedigreeJS
	toCanRiskFormat(familyId = 'XFAM') {
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
		var rawData = 
		[
			data.familyId,    // FamID
			data.name,        // Name (display name)
			data.target,      // Target (proband flag)
			data.name,        // IndivID (unique individual ID)
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
		console.log("Raw CanRisk data for", data.name, ":", rawData);
		console.log("Father ID (position 4):", rawData[4]);
		console.log("Mother ID (position 5):", rawData[5]);
		return rawData.join('\t');
	}

	formatGeneticTest(testName) {
		const result = this.geneticTests[testName];
		if (!result) return '0:0';
		
		switch(result.toUpperCase()) {
			case 'P': return '1:0'; // Positive
			case 'N': return '0:1'; // Negative
			default: return '0:0';  // Unknown
		}
	}
}

const createFamilyData = () => {
	return [
		new Person({
			id: 'parent3',
			name: 'parent3',
			sex: 'F',
			age: 55,
			// diseases: { breast_cancer: 53 }
		}),
		new Person({
			id: 'parent4',
			name: 'parent4',
			sex: 'M',
			age: 60
		}),
		new Person({
			id: 'child7',
			name: 'child7',
			sex: 'F',
			age: 25,
			yearOfBirth: 2000,
			fatherId: 'parent4',
			motherId: 'parent3',
			isTarget: true
		}),
	];
};

// Convert family data to CanRisk format
const generateCanRiskData = (familyData) => {
	const header = "##CanRisk 3.0\n##FamID\tName\tTarget\tIndivID\tFathID\tMothID\tSex\tMZtwin\tDead\tAge\tYob\tBC1\tBC2\tOC\tPRO\tPAN\tAshkn\tBRCA1\tBRCA2\tPALB2\tATM\tCHEK2\tBARD1\tRAD51D\tRAD51C\tBRIP1\tER:PR:HER2:CK14:CK56";
	const rows = familyData.map(person => person.toCanRiskFormat()).join('\n');
	const canRiskData = `${header}\n${rows}`;
	console.log("Generated CanRisk data:\n", canRiskData);
	return canRiskData;
};

export const PedigreeJS = () => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedPerson, setSelectedPerson] = useState(null);
	const [validationError, setValidationError] = useState(null);
	const [rollbackMessage, setRollbackMessage] = useState(null);

	const w = window.innerWidth;
	const h = window.innerHeight;
	const opts = {
		'targetDiv': 'pedigreejs',
		'btn_target': 'pedigree_history',
		'width': (w > 1800 ? 1700: w - 50),
		'height': h*1.0,
		'symbol_size': 30,
		'font_size': '.75em',
		'edit': true,
		'showWidgets': true, // Keep widgets for node interactions
		'zoomIn': .5,
		'zoomOut': 1.5,
		'zoomSrc':  ['wheel', 'button'] ,
		'labels': [['age', 'yob']],
		'diseases': [	{'type': 'breast_cancer', 'colour': '#F68F35'},
						{'type': 'breast_cancer2', 'colour': 'pink'},
						{'type': 'ovarian_cancer', 'colour': '#4DAA4D'},
						{'type': 'pancreatic_cancer', 'colour': '#4289BA'},
						{'type': 'prostate_cancer', 'colour': '#D5494A'}],
		'DEBUG': false,
		'onPersonEdit': (person) => {
			setSelectedPerson(person);
			setDialogOpen(true);
		}
	};

	React.useEffect(() => {
		// Store the edit handler globally so pedigreejs can access it
		window.reactEditHandler = opts.onPersonEdit;
		
		// Expose pedigreejs functions globally for the React controls
		window.pedigreejs = pedigreejs;
		window.pedigreejs_zooming = pedigreejs_zooming;
		window.pedigreejs_pedcache = pedigreejs_pedcache;
		window.pedigreejs_io = pedigreejs_io;
		window.pedigreejs_utils = pedigreejs_utils;
		window.opts = opts; // Make opts globally available for debugging
		
		// Ensure D3 is available globally (it should be available from pedigreejs)
		if (typeof window.d3 === 'undefined' && typeof d3 !== 'undefined') {
			window.d3 = d3;
		}
		
		// Ensure jQuery is available and wait for it to be loaded
		const checkJQuery = () => {
			if (typeof window.$ !== 'undefined' && typeof window.$.fn.dialog !== 'undefined') {
				showPedigree(opts);
				
				// Add widget inspection after pedigree is built
				setTimeout(() => {
					// WORKAROUND: Since tree building isn't working properly, manually add addchild widget
					console.log("=== MANUAL WIDGET FIX ===");
					
					// Find the actual person group elements using a different approach
					const allGroups = document.querySelectorAll('g');
					let child7Group = null;
					
					allGroups.forEach(group => {
						// Look for groups that contain text elements with our person names
						const textElements = group.querySelectorAll('text');
						textElements.forEach(text => {
							if (text.textContent && text.textContent.includes('child7')) {
								child7Group = group;
							}
						});
					});
					
					console.log("Found child7 group:", child7Group);
					
					if (child7Group) {
						// Check if addchild widget already exists
						const existingAddchild = child7Group.querySelector('.addchild');
						if (!existingAddchild) {
							console.log("Adding manual addchild widget to child7");
							
							// Create the addchild widget manually
							const addchildWidget = document.createElementNS("http://www.w3.org/2000/svg", "text");
							addchildWidget.setAttribute("class", "addchild widget");
							addchildWidget.setAttribute("x", "0");
							addchildWidget.setAttribute("y", "-15");
							addchildWidget.setAttribute("text-anchor", "middle");
							addchildWidget.setAttribute("fill", "#1f77b4");
							addchildWidget.style.cursor = "pointer";
							addchildWidget.style.fontSize = "14px";
							addchildWidget.textContent = "+";
							addchildWidget.style.opacity = "0";
							
							// Add hover events
							child7Group.addEventListener('mouseenter', () => {
								addchildWidget.style.opacity = "1";
							});
							child7Group.addEventListener('mouseleave', () => {
								addchildWidget.style.opacity = "0";
							});
							
							// Add click event (simplified)
							addchildWidget.addEventListener('click', () => {
								console.log("Add child clicked for child7!");
								alert("Add child functionality would go here");
							});
							
							child7Group.appendChild(addchildWidget);
							console.log("Added manual addchild widget");
						}
					}
					
					// Widget inspection
					setTimeout(() => {
					console.log("=== WIDGET INSPECTION ===");
					// Look for the actual person nodes, not clipPath elements
					const child7Element = document.querySelector('g[id="child7"]');
					const parent3Element = document.querySelector('g[id="parent3"]');
					const parent4Element = document.querySelector('g[id="parent4"]');
					
					console.log("Child7 element:", child7Element);
					console.log("Parent3 element:", parent3Element);
					console.log("Parent4 element:", parent4Element);
					
					let debugHtml = "<strong>Widget Status:</strong><br/>";
					
					if (child7Element) {
						const widgets = child7Element.querySelectorAll('.widget');
						const hasAddchild = !!child7Element.querySelector('.addchild');
						debugHtml += `Child7: ${widgets.length} widgets, addchild: ${hasAddchild}<br/>`;
						console.log("Child7 widgets:", Array.from(widgets).map(w => w.className));
						console.log("Child7 has addchild:", hasAddchild);
					} else {
						debugHtml += "Child7: g element not found<br/>";
						// Try to find any child7-related elements
						const allChild7 = document.querySelectorAll('[id*="child7"]');
						console.log("All child7 elements:", allChild7);
					}
					
					if (parent3Element) {
						const widgets = parent3Element.querySelectorAll('.widget');
						const hasAddchild = !!parent3Element.querySelector('.addchild');
						debugHtml += `Parent3: ${widgets.length} widgets, addchild: ${hasAddchild}<br/>`;
						console.log("Parent3 widgets:", Array.from(widgets).map(w => w.className));
						console.log("Parent3 has addchild:", hasAddchild);
					}
					
					if (parent4Element) {
						const widgets = parent4Element.querySelectorAll('.widget');
						const hasAddchild = !!parent4Element.querySelector('.addchild');
						debugHtml += `Parent4: ${widgets.length} widgets, addchild: ${hasAddchild}<br/>`;
						console.log("Parent4 widgets:", Array.from(widgets).map(w => w.className));
						console.log("Parent4 has addchild:", hasAddchild);
					}
					
					// Check if any widgets exist at all
					const allWidgets = document.querySelectorAll('.widget');
					const allAddchild = document.querySelectorAll('.addchild');
					console.log("Total widgets in DOM:", allWidgets.length);
					console.log("Total addchild widgets in DOM:", allAddchild.length);
					debugHtml += `<br/><strong>Total widgets:</strong> ${allWidgets.length}<br/>`;
					
					// Check the dataset again after tree building
					if (window.opts && window.opts.dataset) {
						console.log("=== DATASET AFTER TREE BUILDING ===");
						debugHtml += "<br/><strong>Parent Node Status:</strong><br/>";
						window.opts.dataset.forEach(person => {
							const hasParentNode = person.parent_node ? 'YES' : 'NO';
							debugHtml += `${person.name}: parent_node=${hasParentNode}<br/>`;
							console.log(`${person.name}: father=${person.father}, mother=${person.mother}, parent_node=${hasParentNode}`);
						});
					}
					
					// Update debug display
					const debugContent = document.getElementById('debug-content');
					if (debugContent) {
						debugContent.innerHTML = debugHtml;
					}
					}, 500); // End of widget inspection setTimeout
				}, 1000); // End of manual fix setTimeout
			} else {
				setTimeout(checkJQuery, 100);
			}
		};
		checkJQuery();
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
		console.log("Generated CanRisk data (line by line):");
		generatedCanRiskData.split('\n').forEach((line, index) => {
			console.log(`Line ${index}: "${line}"`);
		});
		
		try {
			pedigreejs_io.load_data(generatedCanRiskData, opts);
			console.log("Data loaded successfully");
			console.log("Opts dataset after load_data:");
			console.log(JSON.stringify(opts.dataset, null, 2));
			
			// Check if the relationships are being established correctly
			console.log("=== RELATIONSHIP DEBUGGING ===");
			opts.dataset.forEach(person => {
				console.log(`${person.name}:`, {
					father: person.father,
					mother: person.mother,
					proband: person.proband,
					display_name: person.display_name
				});
			});
			
			// Check each person's parent relationships
			opts.dataset.forEach((person, index) => {
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
			
			{/* Debug information display */}
			{/* <div id="debug-info" style={{
				position: 'fixed',
				top: '10px',
				right: '10px',
				background: 'white',
				border: '2px solid #333',
				padding: '10px',
				zIndex: 10000,
				maxWidth: '400px',
				maxHeight: '300px',
				overflow: 'auto',
				fontSize: '12px',
				fontFamily: 'monospace'
			}}>
				<strong>Debug Info:</strong><br/>
				<div id="debug-content">Loading...</div>
			</div> */}
			
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
			
			{/* React Dialog */}
			<PersonEditDialog
				isOpen={dialogOpen}
				onClose={() => setDialogOpen(false)}
				person={selectedPerson}
				diseases={opts.diseases}
				onSave={(updatedData) => {
					console.log("Saving person data:", updatedData);
					
					// Find the person in the dataset and update their data
					if (selectedPerson && opts.dataset) {
						const personIndex = opts.dataset.findIndex(p => p.name === selectedPerson.data.name);
						if (personIndex !== -1) {
							// Filter out properties that shouldn't be updated (internal pedigreejs properties)
							const disallowed = ["id", "parent_node", "children", "parent", "depth", "height", "x", "y"];
							const filteredData = {};
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
							if (typeof window.$ !== 'undefined') {
								$(document).trigger('rebuild', [opts]);
							} else {
								// Fallback if jQuery is not available
								pedigreejs.rebuild(opts);
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
const showPedigree = (opts) => {
	const p = document.getElementById("pedigreejs");
	const ped = document.getElementById("pedigree");
	if(!p && ped){
		const p = document.createElement('div');
		p.id = 'pedigreejs';
		ped.appendChild(p); 
		pedigreejs_load(opts);
	}
	const refresh = document.getElementsByClassName("fa-refresh");
	if(refresh) refresh[0].style.display = "none";
}

const pedigreejs_load = (opts) => {
	try {
		pedigreejs.rebuild(opts);
		// Only try scaling if rebuild was successful
		try {
			pedigreejs_zooming.scale_to_fit(opts);
		} catch (scalingError) {
			console.warn("Scaling failed, but pedigree should still be visible:", scalingError);
		}
	} catch(e) {
		let msg;
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
