/**
 * End-to-End Test for Auto Interpretation Workflow
 * 
 * Tests the complete user workflow:
 * 1. User selects an interpretation
 * 2. User provides a MUKEY
 * 3. System calculates properties from SSURGO via Python service
 * 4. System evaluates interpretation using fuzzy logic
 * 5. User receives complete results with metadata
 * 
 * Prerequisites:
 * - Next.js app running on http://localhost:3000
 * - Python service running on http://localhost:8000
 * - Valid network connection to NRCS SDA API
 */

describe('Auto Interpretation E2E Workflow', () => {
  const nextJsUrl = 'http://localhost:3000';
  const pythonServiceUrl = 'http://localhost:8000';
  const testMukey = '462809';
  const testInterpretation = 'AGR - Pesticide Loss Potential-Soil Surface Runoff';

  beforeAll(async () => {
    // Verify services are running
    const healthChecks = await Promise.all([
      fetch(`${nextJsUrl}/api/health`),
      fetch(`${pythonServiceUrl}/health`),
    ]);

    expect(healthChecks[0].ok).toBe(true);
    expect(healthChecks[1].ok).toBe(true);
  });

  describe('Complete Auto Interpretation Workflow', () => {
    it('should complete full workflow from MUKEY to evaluation', async () => {
      // Step 1: Verify interpretation exists
      const interpretationsResponse = await fetch(`${nextJsUrl}/api/interpret`);
      expect(interpretationsResponse.ok).toBe(true);
      
      const interpretations = await interpretationsResponse.json();
      const targetInterp = interpretations.interpretations.find(
        (i: any) => i.name === testInterpretation || i.rulename === testInterpretation
      );
      expect(targetInterp).toBeDefined();

      // Step 2: Get required properties for interpretation
      const propertiesResponse = await fetch(
        `${nextJsUrl}/api/interpret/${encodeURIComponent(testInterpretation)}/properties`
      );
      expect(propertiesResponse.ok).toBe(true);
      
      const propertiesData = await propertiesResponse.json();
      expect(propertiesData.properties).toBeDefined();
      expect(propertiesData.properties.length).toBeGreaterThan(0);

      const propertyIds = propertiesData.properties.map((p: any) => p.propiid);

      // Step 3: Calculate properties from SSURGO via Python service
      const calcResponse = await fetch(`${pythonServiceUrl}/properties/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mukey: testMukey,
          property_ids: propertyIds,
          query_strategy: 'auto',
        }),
      });
      expect(calcResponse.ok).toBe(true);
      
      const calculatedProps = await calcResponse.json();
      expect(calculatedProps.success).toBe(true);
      expect(calculatedProps.values).toBeDefined();
      expect(calculatedProps.metadata.mukey).toBe(testMukey);

      // Step 4: Evaluate interpretation with calculated properties
      const evalResponse = await fetch(`${nextJsUrl}/api/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          propertyData: calculatedProps.values,
        }),
      });
      expect(evalResponse.ok).toBe(true);
      
      const evaluation = await evalResponse.json();
      expect(evaluation.success).toBe(true);
      expect(evaluation.result.rating).toBeGreaterThanOrEqual(0);
      expect(evaluation.result.rating).toBeLessThanOrEqual(1);
      expect(evaluation.result.tree).toBeDefined();
      expect(evaluation.result.evaluationResults).toBeDefined();

      // Step 5: Verify complete workflow metadata
      expect(evaluation.metadata).toBeDefined();
      expect(evaluation.metadata.interpretation).toBe(testInterpretation);
      expect(evaluation.metadata.propertiesUsed).toBeGreaterThan(0);
    }, 45000); // Allow 45s for full workflow

    it('should use auto endpoint for streamlined workflow', async () => {
      const startTime = Date.now();

      // Single API call that does everything
      const response = await fetch(`${nextJsUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: testMukey,
        }),
      });

      const elapsed = Date.now() - startTime;

      expect(response.ok).toBe(true);
      const result = await response.json();

      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.rating).toBeGreaterThanOrEqual(0);
      expect(result.result.rating).toBeLessThanOrEqual(1);

      // Verify metadata includes both property calculation and evaluation
      expect(result.metadata.mukey).toBe(testMukey);
      expect(result.metadata.interpretation).toBe(testInterpretation);
      expect(result.metadata.property_calculation).toBeDefined();
      expect(result.metadata.property_calculation.query_count).toBeGreaterThan(0);
      expect(result.metadata.property_calculation.execution_time_ms).toBeGreaterThan(0);

      // Performance check: should complete within acceptable time
      expect(elapsed).toBeLessThan(15000); // 15 seconds
    }, 20000);

    it('should demonstrate caching benefits', async () => {
      // First request (uncached)
      const start1 = Date.now();
      const response1 = await fetch(`${nextJsUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: testMukey,
        }),
      });
      const time1 = Date.now() - start1;
      expect(response1.ok).toBe(true);

      // Second request (should benefit from caching)
      const start2 = Date.now();
      const response2 = await fetch(`${nextJsUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: testMukey,
        }),
      });
      const time2 = Date.now() - start2;
      expect(response2.ok).toBe(true);

      const result1 = await response1.json();
      const result2 = await response2.json();

      // Results should be identical
      expect(result1.result.rating).toBe(result2.result.rating);

      // Second request should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.6); // At least 40% faster

      console.log(`Performance: First=${time1}ms, Second=${time2}ms (${((1 - time2/time1) * 100).toFixed(1)}% faster)`);
    }, 40000);
  });

  describe('Error Handling E2E', () => {
    it('should handle non-existent interpretation gracefully', async () => {
      const response = await fetch(`${nextJsUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: 'Non-Existent Interpretation',
          mukey: testMukey,
        }),
      });

      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error.error).toBeDefined();
    });

    it('should handle invalid MUKEY gracefully', async () => {
      const response = await fetch(`${nextJsUrl}/api/interpret/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpretationName: testInterpretation,
          mukey: 'invalid-mukey-format',
        }),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBeDefined();
    });

    it('should handle Python service being unavailable', async () => {
      // This test would require mocking or stopping the Python service
      // Skipped for now as it would break other tests
      // Could be implemented with Docker containers or service mocking
    });
  });

  describe('Multiple Interpretations E2E', () => {
    const interpretationsToTest = [
      'AGR - Pesticide Loss Potential-Soil Surface Runoff',
      'AWM - Manure and Food Processing Waste',
      'AGR - Surface Runoff, Dominant Condition',
    ];

    it('should evaluate multiple interpretations for same MUKEY', async () => {
      const results = await Promise.all(
        interpretationsToTest.map(async (interpName) => {
          const response = await fetch(`${nextJsUrl}/api/interpret/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              interpretationName: interpName,
              mukey: testMukey,
            }),
          });

          if (!response.ok) {
            return null; // Some interpretations may not exist
          }

          return await response.json();
        })
      );

      const successfulResults = results.filter(r => r && r.success);
      expect(successfulResults.length).toBeGreaterThan(0);

      // Verify each result has valid rating
      successfulResults.forEach(result => {
        expect(result.result.rating).toBeGreaterThanOrEqual(0);
        expect(result.result.rating).toBeLessThanOrEqual(1);
        expect(result.metadata.mukey).toBe(testMukey);
      });
    }, 60000); // Allow extra time for multiple evaluations
  });
});
