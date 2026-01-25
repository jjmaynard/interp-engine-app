# Missing Data Analysis

## Summary

The NRCS interpretation data has **incomplete coverage** - interpretation trees reference evaluations that don't exist in the evaluations export.

## Missing Evaluations

The following evaluation IDs are referenced in interpretation trees but **do not exist** in evaluations.json:

| Eval ID | Status | Impact |
|---------|--------|--------|
| 203 | ❌ Missing | Returns NaN in calculations |
| 204 | ❌ Missing | Returns NaN in calculations |
| 197 | ❌ Missing | Returns NaN in calculations |
| 10266 | ❌ Missing | Returns NaN in calculations |
| 218 | ❌ Missing | Returns NaN in calculations |
| 227 | ❌ Missing | Returns NaN in calculations |
| 63590 | ❌ Missing | Returns NaN in calculations |

## Data Statistics

**Evaluations:**
- Total in file: 10,861
- With fuzzy curves: 5,509 (51%)
- With crisp expressions: 4,476 (41%)
- Without any evaluation logic: ~800 (7%)

**Interpretations:**
- Total: 2,000+
- With complete evaluations: Unknown (need full audit)

## Evaluations Without Points or Crisp Expressions

Some evaluations exist but have neither fuzzy curves nor crisp expressions. Example from logs:
- "Coarse Fragments 75 to 250mm" (10192)
- "Slope 0 to >25%" (219)

These evaluations have empty `<DomainPoints />` and `<RangePoints />` and no `<CrispExpression>`.

## Impact on Fuzzy Logic Engine

### How NaN Values Are Handled

When an evaluation is missing or returns NaN:
1. **AND operators** (`fuzzyAnd`): NaN values are filtered out before taking minimum
2. **OR operators** (`fuzzyOr`): NaN values are filtered out before taking maximum  
3. **PRODUCT operators**: NaN values are filtered out before multiplication

This means missing evaluations are **ignored** in calculations rather than causing failures.

### Current Behavior

✅ **Working interpretations** (with some missing evals):
- Example: "AWM - Manure and Food Processing Waste"
- Had 7 NaN values but still returned rating of 1.0 (very severe)
- OR operator took maximum of valid values

⚠️ **Potentially incorrect results**:
- If ALL evaluations in a branch are missing → branch returns NaN
- If critical evaluations are missing → rating may be inaccurate

## Recommendations

### Short Term (Current Implementation)
✅ Filter NaN values in operators (already implemented)
✅ Log warnings for missing evaluations (already implemented)
✅ Continue processing with available data

### Medium Term (Improvements)
1. **Audit all 2000+ interpretations** to count missing evaluations
2. **Create fallback values** for common missing evaluations
3. **Document known limitations** per interpretation

### Long Term (Data Quality)
1. **Request complete evaluation export** from NRCS
2. **Cross-reference** interpretation trees with evaluation availability
3. **Create data validation** tool to detect missing references before deployment

## Data Sources

- **evaluations.json**: 14MB, 10,861 evaluations
- **primary_interpretation_trees.json**: 55MB, 2000+ interpretations
- **properties.json**: 1.7MB, property definitions

All source files are in: `/data/` directory

## Current Engine Capabilities

Despite missing data, the engine successfully handles:
- ✅ Linear interpolation (fuzzy curves)
- ✅ Spline interpolation (arbitrary curves)  
- ✅ Sigmoid curves (with auto-generated 0-1 range)
- ✅ Numeric crisp expressions (`<`, `>`, `<=`, `>=`, `=`)
- ✅ Categorical crisp expressions (`="value"`, OR patterns, matches patterns)
- ✅ Range expressions (`>=7 and <10`)
- ✅ Multi-value OR (`="val1" or "val2" or "val3"`)
- ✅ Operator nodes (AND, OR, PRODUCT, etc.)
- ✅ Hedge modifiers (very, slightly, not, etc.)
- ✅ Inverted evaluations

## Next Steps

1. Run full audit of all interpretations to count missing evaluations
2. Determine if patterns exist (e.g., certain property types always missing)
3. Contact NRCS or check alternative data sources for complete evaluation set
