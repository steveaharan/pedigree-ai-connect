/**
 * Modern React component for editing person details in the pedigree
 * © 2024 University of Cambridge. All rights reserved.
 */
import React, { useState, useEffect } from 'react';
import './PersonEditDialog.css';

interface Disease {
	type: string;
	colour: string;
}

interface PersonData {
	name: string;
	display_name?: string;
	age?: number | string;
	dob?: string;
	dod?: string;
	sex: 'M' | 'F' | 'U';
	status: string | number;
	adopted_in?: boolean;
	adopted_out?: boolean;
	miscarriage?: boolean;
	stillbirth?: boolean;
	termination?: boolean;
	yob?: number;
	[key: string]: any;
}

interface PersonEditDialogProps {
	isOpen: boolean;
	onClose: () => void;
	person: any;
	diseases?: Disease[];
	onSave: (data: PersonData) => void;
	validationError?: string | null;
}

const PersonEditDialog: React.FC<PersonEditDialogProps> = ({ 
  isOpen, 
  onClose, 
  person, 
  diseases = [], 
  onSave,
  validationError = null
}) => {
  const [formData, setFormData] = useState<PersonData>({
    name: '',
    display_name: '',
    age: '',
    dob: '', // Changed from yob to dob
    dod: '', // Date of Death
    sex: 'U',
    status: '0',
    adopted_in: false,
    adopted_out: false,
    miscarriage: false,
    stillbirth: false,
    termination: false,
    ...person?.data || {}
  });

  const [diseaseAges, setDiseaseAges] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('basic');

  // Helper function to format date input as DD/MM/YYYY
  const formatDateInput = (value: string): string => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Add slashes automatically
    if (numericValue.length <= 2) {
      return numericValue;
    } else if (numericValue.length <= 4) {
      return `${numericValue.slice(0, 2)}/${numericValue.slice(2)}`;
    } else {
      return `${numericValue.slice(0, 2)}/${numericValue.slice(2, 4)}/${numericValue.slice(4, 8)}`;
    }
  };

  // Helper function to calculate age from date of birth
  const calculateAgeFromDOB = (dob: string): string => {
    if (!dob) return '';
    
    // Parse DD/MM/YYYY format
    const parts = dob.split('/');
    if (parts.length !== 3) return '';
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed in Date
    const year = parseInt(parts[2]);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    
    const birthDate = new Date(year, month, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age.toString() : '';
  };

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD for date input
  const convertToDateInputFormat = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Helper function to convert YYYY-MM-DD to DD/MM/YYYY
  const convertFromDateInputFormat = (yyyymmdd: string): string => {
    if (!yyyymmdd) return '';
    const [year, month, day] = yyyymmdd.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (person?.data) {
      const initialData: PersonData = {
        name: '',
        display_name: '',
        age: '',
        dob: '', // Changed from yob
        dod: '', // Date of Death
        sex: 'U',
        status: '0',
        adopted_in: false,
        adopted_out: false,
        miscarriage: false,
        stillbirth: false,
        termination: false,
        ...person.data
      };
      
      // Convert yob to dob if yob exists but dob doesn't
      if (person.data.yob && !person.data.dob) {
        initialData.dob = `01/01/${person.data.yob}`;
      }
      
      // If date of birth is present, calculate age automatically
      if (initialData.dob) {
        const age = calculateAgeFromDOB(initialData.dob);
        initialData.age = age;
      }
      
      setFormData(initialData);

      // Initialize disease ages
      const ages: Record<string, string> = {};
      diseases.forEach(disease => {
        const ageKey = `${disease.type}_diagnosis_age`;
        ages[disease.type] = person.data[ageKey] || '';
      });
      setDiseaseAges(ages);
      
      // Reset to basic tab when opening dialog
      setActiveTab('basic');
    }
  }, [person, diseases]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // If date of birth is changed, format it and calculate age automatically
      if (field === 'dob') {
        // Format the input as DD/MM/YYYY
        const formattedDate = formatDateInput(value);
        updated.dob = formattedDate;
        
        // Calculate age from the formatted date
        const calculatedAge = calculateAgeFromDOB(formattedDate);
        updated.age = calculatedAge;
      }
      
      // If date of death is changed, format it
      if (field === 'dod') {
        // Format the input as DD/MM/YYYY
        const formattedDate = formatDateInput(value);
        updated.dod = formattedDate;
      }
      
      return updated;
    });
  };

  const handleDatePickerChange = (value: string) => {
    const formattedDate = convertFromDateInputFormat(value);
    setFormData(prev => ({
      ...prev,
      dob: formattedDate,
      age: calculateAgeFromDOB(formattedDate)
    }));
  };

  const handleDeathDatePickerChange = (value: string) => {
    const formattedDate = convertFromDateInputFormat(value);
    setFormData(prev => ({
      ...prev,
      dod: formattedDate
    }));
  };

  const handleDiseaseAgeChange = (diseaseType: string, age: string) => {
    setDiseaseAges(prev => ({
      ...prev,
      [diseaseType]: age
    }));
  };

  const handleSave = () => {
    // Combine form data with disease ages
    const updatedData: PersonData = { ...formData };
    
    // Ensure status is a number
    updatedData.status = parseInt(updatedData.status as string);
    
    // Handle date of birth and calculate age
    if (updatedData.dob) {
      // Always recalculate age from date of birth
      const calculatedAge = calculateAgeFromDOB(updatedData.dob);
      updatedData.age = calculatedAge !== '' ? parseInt(calculatedAge) : 0;
      
      // Also save year of birth for backward compatibility
      const parts = updatedData.dob.split('/');
      if (parts.length === 3) {
        updatedData.yob = parseInt(parts[2]);
      }
    } else {
      // If no date of birth, age should be empty/zero
      updatedData.age = 0;
      updatedData.yob = 0;
    }
    
    // Add disease diagnosis ages
    Object.entries(diseaseAges).forEach(([diseaseType, age]) => {
      if (age) {
        updatedData[`${diseaseType}_diagnosis_age`] = parseInt(age);
      }
    });

    onSave(updatedData);
    onClose();
  };

  const capitalizeFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Edit Person Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {validationError && (
          <div className="validation-error">
            <strong>Validation Error:</strong>
            <div className="error-details">
              {validationError.split('\n').map((line, index) => (
                <div key={index} className={index === 0 ? 'error-main' : 'error-help'}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dialog-body">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic Information
            </button>
            <button 
              className={`tab-button ${activeTab === 'diagnosis' ? 'active' : ''}`}
              onClick={() => setActiveTab('diagnosis')}
            >
              Diagnosis
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'basic' && (
            <div className="tab-content">
              <div className="form-section">
                <div className="form-row">
                  <label htmlFor="name">Individual ID:</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name || ''}
                    readOnly
                    className="readonly-field"
                    title="Individual ID cannot be changed"
                  />
                </div>

                <div className="form-row">
                  <label>Gender:</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="sex"
                        value="M"
                        checked={formData.sex === 'M'}
                        onChange={e => handleInputChange('sex', e.target.value)}
                      />
                      Male
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="sex"
                        value="F"
                        checked={formData.sex === 'F'}
                        onChange={e => handleInputChange('sex', e.target.value)}
                      />
                      Female
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="sex"
                        value="U"
                        checked={formData.sex === 'U'}
                        onChange={e => handleInputChange('sex', e.target.value)}
                      />
                      Unknown
                    </label>
                  </div>
                </div>                

                <div className="form-row">
                  <label htmlFor="display_name">Display Name:</label>
                  <input
                    type="text"
                    id="display_name"
                    value={formData.display_name || ''}
                    onChange={e => handleInputChange('display_name', e.target.value)}
                    placeholder="Name shown on pedigree"
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="age">Age:</label>
                  <input
                    type="number"
                    id="age"
                    min="0"
                    max="120"
                    value={formData.age || ''}
                    readOnly
                    className="readonly-field"
                    title="Age is automatically calculated from Date of Birth"
                    placeholder="Enter Date of Birth to calculate age"
                  />
                  <div className="field-helper-text">
                    {formData.dob && formData.dob !== '' 
                      ? 'Automatically calculated from date of birth' 
                      : 'Enter Date of Birth below to calculate age'
                    }
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="dob">Date of Birth:</label>
                  <div className="date-input-group">
                    <input
                      type="date"
                      id="dob-picker"
                      value={convertToDateInputFormat(formData.dob || '')}
                      onChange={e => handleDatePickerChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="date-picker-input"
                      title="Use date picker or type DD/MM/YYYY in the text field"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label>Status:</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="status"
                        value="0"
                        checked={formData.status === '0' || formData.status === 0}
                        onChange={e => handleInputChange('status', e.target.value)}
                      />
                      Alive
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="status"
                        value="1"
                        checked={formData.status === '1' || formData.status === 1}
                        onChange={e => handleInputChange('status', e.target.value)}
                      />
                      Deceased
                    </label>
                  </div>
                </div>

                {/* Date of Death - only show if status is Deceased */}
                {(formData.status === '1' || formData.status === 1) && (
                  <div className="form-row">
                    <label htmlFor="dod">Date of Death:</label>
                    <div className="date-input-group">
                      <input
                        type="date"
                        id="dod-picker"
                        value={convertToDateInputFormat(formData.dod || '')}
                        onChange={e => handleDeathDatePickerChange(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="date-picker-input"
                        title="Use date picker or type DD/MM/YYYY in the text field"
                      />
                    </div>
                    <div className="field-helper-text">
                      Date when the individual died
                    </div>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Reproduction</h3>
                <div className="checkbox-group">
                  {['adopted_in', 'adopted_out', 'miscarriage', 'stillbirth', 'termination'].map(field => (
                    <label key={field} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData[field] || false}
                        onChange={e => handleInputChange(field, e.target.checked)}
                      />
                      {capitalizeFirstLetter(field)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnosis' && (
            <div className="tab-content">
              <div className="form-section">
                <h3>Age of Diagnosis</h3>
                {diseases.length > 0 ? (
                  diseases.map(disease => (
                    <div key={disease.type} className="form-row">
                      <label htmlFor={`disease_${disease.type}`}>
                        {capitalizeFirstLetter(disease.type)}:
                        <span 
                          className="disease-color-indicator"
                          style={{ backgroundColor: disease.colour }}
                        ></span>
                      </label>
                      <input
                        type="number"
                        id={`disease_${disease.type}`}
                        min="0"
                        max="110"
                        value={diseaseAges[disease.type] || ''}
                        onChange={e => handleDiseaseAgeChange(disease.type, e.target.value)}
                        placeholder="Age at diagnosis"
                      />
                    </div>
                  ))
                ) : (
                  <div className="no-diseases-message">
                    <p>No diseases configured for this pedigree.</p>
                    <p className="help-text">Disease types are configured at the pedigree level.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonEditDialog; 