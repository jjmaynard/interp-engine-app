import 'server-only';

import type { Property } from '@/types/interpretation';
import {
  loadEvaluationsServer,
  loadInterpretationTreesServer,
  loadPropertiesServer,
} from '@/lib/data/server-loader';

let interpretationPropertyIdsMap: Map<string, Set<number>> | null = null;

function buildInterpretationPropertyIdsMap(): Map<string, Set<number>> {
  if (interpretationPropertyIdsMap) return interpretationPropertyIdsMap;

  const trees = loadInterpretationTreesServer();
  const evaluations = loadEvaluationsServer();

  const evalByRefId = new Map<string, string>();
  for (const evaluation of evaluations) {
    if (evaluation.evaliid && evaluation.propname) {
      evalByRefId.set(String(evaluation.evaliid), evaluation.propname);
    }
    if (evaluation.evalname && evaluation.propname) {
      evalByRefId.set(evaluation.evalname, evaluation.propname);
    }
  }

  const propertyIdsByInterpretation = new Map<string, Set<number>>();

  for (const interpretation of trees) {
    const ids = new Set<number>();

    const addFromPropertiesArray = () => {
      if (!interpretation.properties) return;
      for (const p of interpretation.properties) {
        const id = Number(p.propiid);
        if (!Number.isNaN(id)) ids.add(id);
      }
    };

    const addFromTreeEvaluationRefs = () => {
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;

        const refId = node.RefId || node.rule_refid;
        if (refId) {
          const propName = evalByRefId.get(String(refId));
          if (propName) {
            // Name -> ID mapping is resolved below from full property list.
          }
        }

        if (Array.isArray(node.children)) {
          for (const child of node.children) walk(child);
        }
      };

      const root = interpretation.tree;
      if (Array.isArray(root)) {
        for (const node of root) walk(node);
      } else {
        walk(root);
      }
    };

    addFromPropertiesArray();
    addFromTreeEvaluationRefs();

    propertyIdsByInterpretation.set(interpretation.rulename, ids);
  }

  // Backfill any missing IDs by traversing tree eval refs -> propname -> property ID.
  const properties = loadPropertiesServer();
  const propertyIdByName = new Map<string, number>();
  for (const property of properties) {
    propertyIdByName.set(property.propname, property.propiid);
  }

  for (const interpretation of trees) {
    const ids = propertyIdsByInterpretation.get(interpretation.rulename) || new Set<number>();

    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;

      const refId = node.RefId || node.rule_refid;
      if (refId) {
        const propName = evalByRefId.get(String(refId));
        if (propName) {
          const propId = propertyIdByName.get(propName);
          if (propId !== undefined) ids.add(propId);
        }
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child);
      }
    };

    const root = interpretation.tree;
    if (Array.isArray(root)) {
      for (const node of root) walk(node);
    } else {
      walk(root);
    }

    propertyIdsByInterpretation.set(interpretation.rulename, ids);
  }

  interpretationPropertyIdsMap = propertyIdsByInterpretation;
  return interpretationPropertyIdsMap;
}

export function loadPropertiesForInterpretation(interpretationName: string): Property[] {
  const dependencyMap = buildInterpretationPropertyIdsMap();
  const requiredIds = dependencyMap.get(interpretationName) || new Set<number>();
  const properties = loadPropertiesServer();

  if (requiredIds.size === 0) return [];

  return properties.filter(p => requiredIds.has(p.propiid));
}

export function getPropertyDependencyStats() {
  const dependencyMap = buildInterpretationPropertyIdsMap();
  const allSizes = Array.from(dependencyMap.values()).map(set => set.size);

  return {
    interpretations: dependencyMap.size,
    minProperties: allSizes.length ? Math.min(...allSizes) : 0,
    maxProperties: allSizes.length ? Math.max(...allSizes) : 0,
    avgProperties: allSizes.length
      ? Math.round(allSizes.reduce((sum, n) => sum + n, 0) / allSizes.length)
      : 0,
  };
}
