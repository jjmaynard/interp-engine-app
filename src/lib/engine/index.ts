/**
 * Interpretation Engine Module
 * 
 * Main exports for the NRCS Soil Interpretation Engine
 */

// Main engine class
export {
  InterpretationEngine,
  createInterpretationEngine,
  getDefaultEngine,
  resetDefaultEngine,
  type InterpretationEngineConfig,
} from './InterpretationEngine';

// Evaluator
export {
  evaluateInterpretation,
  batchEvaluateInterpretation,
  evaluateNode,
  getRequiredProperties,
  lookupRatingClass,
  type PropertyData,
} from './evaluator';

// Evaluation functions
export {
  linearInterpolation,
  stepFunction,
  splineInterpolation,
  categoricalEvaluation,
  sigmoidEvaluation,
  crispEvaluation,
  evaluateProperty,
} from './evaluations';

// Fuzzy operators
export {
  fuzzyAnd,
  fuzzyOr,
  fuzzyProduct,
  fuzzySum,
  fuzzyTimes,
  applyOperator,
  weightedAverage,
} from './operators';

// Hedge functions
export {
  notHedge,
  multiplyHedge,
  powerHedge,
  limitHedge,
  nullOrHedge,
  notNullAndHedge,
  nullNotRatedHedge,
  veryHedge,
  somewhatHedge,
  applyHedge,
  handleNulls,
  isNull,
} from './hedges';
