'use client';

import { useState, useEffect } from 'react';
import type { Property } from '@/types/interpretation';

interface PropertyInputFormProps {
  properties: Property[];
  onSubmit: (values: Record<string, number | null>) => void;
  loading?: boolean;
}

export function PropertyInputForm({ 
  properties, 
  onSubmit,
  loading = false 
}: PropertyInputFormProps) {
  const [values, setValues] = useState<Record<string, number | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize values
  useEffect(() => {
    const initialValues: Record<string, number | null> = {};
    properties.forEach(prop => {
      initialValues[prop.propname] = null;
    });
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [properties]);

  const validateField = (propname: string, value: number | null, property: Property): string => {
    if (value === null || value === undefined) {
      return 'This field is required';
    }

    if (isNaN(value)) {
      return 'Please enter a valid number';
    }

    if (property.propmin !== null && property.propmin !== undefined && value < property.propmin) {
      return `Value must be at least ${property.propmin}`;
    }

    if (property.propmax !== null && property.propmax !== undefined && value > property.propmax) {
      return `Value must be at most ${property.propmax}`;
    }

    return '';
  };

  const handleChange = (propname: string, value: string, property: Property) => {
    const numValue = value === '' ? null : parseFloat(value);
    setValues(prev => ({ ...prev, [propname]: numValue }));

    // Validate on change if already touched
    if (touched[propname]) {
      const error = validateField(propname, numValue, property);
      setErrors(prev => ({ ...prev, [propname]: error }));
    }
  };

  const handleBlur = (propname: string, property: Property) => {
    setTouched(prev => ({ ...prev, [propname]: true }));
    const error = validateField(propname, values[propname], property);
    setErrors(prev => ({ ...prev, [propname]: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};
    
    properties.forEach(prop => {
      newTouched[prop.propname] = true;
      const error = validateField(prop.propname, values[prop.propname], prop);
      if (error) {
        newErrors[prop.propname] = error;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    // If no errors, submit
    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    }
  };

  const handleReset = () => {
    const resetValues: Record<string, number | null> = {};
    properties.forEach(prop => {
      resetValues[prop.propname] = null;
    });
    setValues(resetValues);
    setErrors({});
    setTouched({});
  };

  const handleAutoFill = () => {
    const autoValues: Record<string, number | null> = {};
    
    properties.forEach(prop => {
      // Generate realistic dummy value based on property characteristics
      let dummyValue: number;
      
      const propLower = prop.propname.toLowerCase();
      const propName = prop.propname;
      
      // Get actual min/max from property, default to reasonable values
      let effectiveMin = typeof prop.propmin === 'number' ? prop.propmin : 
                         (typeof prop.propmin === 'string' ? parseFloat(prop.propmin) : 0);
      let effectiveMax = typeof prop.propmax === 'number' ? prop.propmax : 
                         (typeof prop.propmax === 'string' ? parseFloat(prop.propmax) : 100);
      
      // Ensure valid range
      if (isNaN(effectiveMin)) effectiveMin = 0;
      if (isNaN(effectiveMax)) effectiveMax = 100;
      if (effectiveMin > effectiveMax) {
        const temp = effectiveMin;
        effectiveMin = effectiveMax;
        effectiveMax = temp;
      }
      
      // ===== SOIL DEPTH PROPERTIES =====
      if (propLower.includes('depth') && !propLower.includes('ph')) {
        // Depths in cm: typical soil depths are 0-200cm
        effectiveMax = Math.min(effectiveMax, 200);
        if (propLower.includes('restrictive') || propLower.includes('restriction')) {
          // Restrictive layers typically at 50-150cm
          dummyValue = 60 + Math.random() * 90;
        } else if (propLower.includes('root') || propLower.includes('rooting')) {
          // Root zones typically 30-120cm
          dummyValue = 40 + Math.random() * 80;
        } else {
          // General depth measurements
          dummyValue = 20 + Math.random() * 150;
        }
        dummyValue = Math.round(dummyValue);
      }
      
      // ===== SLOPE PROPERTIES =====
      else if (propLower.includes('slope')) {
        // Slopes: realistic range 0-45%, with most soils under 30%
        effectiveMax = Math.min(effectiveMax, 60);
        // Weight towards lower slopes (more common)
        dummyValue = Math.pow(Math.random(), 1.5) * 30;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== pH PROPERTIES =====
      else if (propLower.includes('ph') && !propLower.includes('depth')) {
        // pH: realistic range 4.5-8.5, most soils 5.5-7.5
        effectiveMin = Math.max(effectiveMin, 4.0);
        effectiveMax = Math.min(effectiveMax, 9.0);
        dummyValue = 5.5 + Math.random() * 2.0; // concentrated in 5.5-7.5
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== BULK DENSITY =====
      else if (propLower.includes('bulk density') || propLower.includes('bulk dens')) {
        // Bulk density: 0.9-1.8 g/cm³ (1.0-1.5 most common)
        effectiveMin = Math.max(effectiveMin, 0.8);
        effectiveMax = Math.min(effectiveMax, 2.0);
        dummyValue = 1.1 + Math.random() * 0.5; // concentrated around 1.1-1.6
        dummyValue = Math.round(dummyValue * 100) / 100;
      }
      
      // ===== CLAY CONTENT =====
      else if (propLower.includes('clay')) {
        // Clay content: 5-60%, typical 15-35%
        effectiveMax = Math.min(effectiveMax, 70);
        dummyValue = 12 + Math.random() * 30;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== SAND CONTENT =====
      else if (propLower.includes('sand')) {
        // Sand content: 10-85%, typical 20-60%
        effectiveMax = Math.min(effectiveMax, 95);
        dummyValue = 25 + Math.random() * 45;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== SILT CONTENT =====
      else if (propLower.includes('silt')) {
        // Silt content: 5-70%, typical 15-50%
        effectiveMax = Math.min(effectiveMax, 80);
        dummyValue = 18 + Math.random() * 35;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== ORGANIC MATTER =====
      else if (propLower.includes('organic') || propLower.includes('om ')) {
        // Organic matter: 0.5-10%, typical 1-4%
        effectiveMax = Math.min(effectiveMax, 15);
        dummyValue = 0.8 + Math.random() * 4;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== PERMEABILITY / HYDRAULIC CONDUCTIVITY =====
      else if (propLower.includes('permeability') || propLower.includes('ksat') || 
               propLower.includes('hydraulic conductivity')) {
        // Ksat typically 0.01-100 um/sec, log-scale distribution
        dummyValue = Math.pow(10, Math.random() * 3 - 1); // 0.1 to 100
        dummyValue = Math.round(dummyValue * 100) / 100;
      }
      
      // ===== WATER TABLE / PONDING =====
      else if (propLower.includes('water table') || propLower.includes('ponding') || 
               propLower.includes('flooding')) {
        // Depth to water table or duration: 0-200cm or 0-30 days
        if (propLower.includes('depth')) {
          dummyValue = 80 + Math.random() * 100; // typically deeper
          dummyValue = Math.round(dummyValue);
        } else {
          // Duration in days
          dummyValue = Math.random() * 15;
          dummyValue = Math.round(dummyValue);
        }
      }
      
      // ===== CATION EXCHANGE CAPACITY (CEC) =====
      else if (propLower.includes('cec') || propLower.includes('cation exchange')) {
        // CEC: 2-40 meq/100g, typical 8-25
        effectiveMax = Math.min(effectiveMax, 50);
        dummyValue = 8 + Math.random() * 20;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== SALINITY / EC =====
      else if (propLower.includes('ec') || propLower.includes('electrical conductivity') || 
               propLower.includes('salinity')) {
        // EC: 0-16 dS/m, most soils < 4
        effectiveMax = Math.min(effectiveMax, 20);
        dummyValue = Math.random() * 3; // concentrated in low range
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== SODIUM ADSORPTION RATIO (SAR) =====
      else if (propLower.includes('sar') || propLower.includes('sodium adsorption')) {
        // SAR: 0-30, most soils < 13
        effectiveMax = Math.min(effectiveMax, 40);
        dummyValue = Math.random() * 8;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== ROCK FRAGMENTS / SIEVE PASSING =====
      else if (propLower.includes('rock') || propLower.includes('gravel') || 
               propLower.includes('fragment') || propLower.includes('sieve') ||
               propLower.includes('passing')) {
        // Rock fragments/sieve: typically 0-100% (weight percent)
        // Use actual max if it's 100 or less (percentage), otherwise scale down
        const maxPercent = Math.min(effectiveMax, 100);
        dummyValue = Math.random() * Math.min(maxPercent, 40); // typical 0-40%
        dummyValue = Math.round(dummyValue);
      }
      
      // ===== PERCENTAGE PROPERTIES =====
      else if (propLower.includes('percent') || propLower.includes('pct') || propLower.includes('%')) {
        effectiveMax = Math.min(effectiveMax, 100);
        // General percentage: spread across range but weight towards middle
        dummyValue = 20 + Math.random() * 60;
        dummyValue = Math.round(dummyValue * 10) / 10;
      }
      
      // ===== THICKNESS / WIDTH MEASUREMENTS =====
      else if (propLower.includes('thickness') || propLower.includes('thk')) {
        // Layer thickness: 5-100cm
        dummyValue = 10 + Math.random() * 70;
        dummyValue = Math.round(dummyValue);
      }
      
      // ===== TAXONOMIC / CLASSIFICATION (integers) =====
      else if (propLower.includes('taxon') || propLower.includes('order') || 
               propLower.includes('suborder') || propLower.includes('great group')) {
        // These are usually coded integers
        effectiveMax = Math.min(effectiveMax, 100);
        dummyValue = Math.floor(Math.random() * (effectiveMax - effectiveMin + 1)) + effectiveMin;
      }
      
      // ===== DEFAULT CASE: Use property min/max with realistic constraints =====
      else {
        if (effectiveMin !== null && effectiveMin !== undefined && 
            effectiveMax !== null && effectiveMax !== undefined) {
          // Generate value in middle 60% of range (avoid extremes)
          const range = effectiveMax - effectiveMin;
          const buffer = range * 0.2;
          const min = effectiveMin + buffer;
          const max = effectiveMax - buffer;
          dummyValue = Math.random() * (max - min) + min;
          
          // Round based on the range magnitude
          if (range < 5) {
            dummyValue = Math.round(dummyValue * 100) / 100; // 2 decimals
          } else if (range < 50) {
            dummyValue = Math.round(dummyValue * 10) / 10; // 1 decimal
          } else {
            dummyValue = Math.round(dummyValue); // whole number
          }
        } else if (effectiveMin !== null && effectiveMin !== undefined) {
          dummyValue = effectiveMin + Math.random() * 30;
          dummyValue = Math.round(dummyValue * 10) / 10;
        } else if (effectiveMax !== null && effectiveMax !== undefined) {
          dummyValue = (effectiveMax * 0.4) + (Math.random() * effectiveMax * 0.3);
          dummyValue = Math.round(dummyValue * 10) / 10;
        } else {
          dummyValue = 20 + Math.random() * 40;
          dummyValue = Math.round(dummyValue * 10) / 10;
        }
      }
      
      // FINAL STEP: Ensure value is within the actual property min/max bounds
      dummyValue = Math.max(effectiveMin, Math.min(effectiveMax, dummyValue));
      
      autoValues[prop.propname] = dummyValue;
    });
    
    setValues(autoValues);
    setErrors({});
    setTouched({});
  };

  if (properties.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No properties available for this interpretation.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {properties.map((property, index) => (
          <div key={property.propiid || index} className="space-y-2">
            <label 
              htmlFor={`prop-${property.propname}`}
              className="block text-sm font-medium text-gray-700"
            >
              {property.propname}
              {property.propuom && (
                <span className="text-gray-500 ml-1 font-normal">
                  ({property.propuom})
                </span>
              )}
              <span className="text-red-500 ml-1">*</span>
            </label>

            <input
              id={`prop-${property.propname}`}
              type="number"
              step="any"
              value={values[property.propname] ?? ''}
              onChange={(e) => handleChange(property.propname, e.target.value, property)}
              onBlur={() => handleBlur(property.propname, property)}
              disabled={loading}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                errors[property.propname] && touched[property.propname]
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
              placeholder={
                property.propmin !== null && property.propmin !== undefined && 
                property.propmax !== null && property.propmax !== undefined
                  ? `${property.propmin} - ${property.propmax}`
                  : 'Enter value'
              }
            />

            {/* Hints and validation messages */}
            <div className="flex items-start justify-between gap-2">
              {property.propmin !== null && property.propmin !== undefined && 
               property.propmax !== null && property.propmax !== undefined && (
                <p className="text-xs text-gray-500">
                  Valid range: {property.propmin} - {property.propmax}
                </p>
              )}
              
              {errors[property.propname] && touched[property.propname] && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors[property.propname]}
                </p>
              )}
            </div>

            {/* Property modifier info */}
            {property.propmod && (
              <p className="text-xs text-blue-600 italic">
                Modifier: {property.propmod}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Form actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Evaluating...
            </span>
          ) : (
            'Calculate Interpretation'
          )}
        </button>
        
        <button
          type="button"
          onClick={handleAutoFill}
          disabled={loading}
          className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
          title="Auto-fill with sample data"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Sample Data
          </span>
        </button>
        
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 text-center">
        <p>All fields marked with <span className="text-red-500">*</span> are required</p>
      </div>
    </form>
  );
}
