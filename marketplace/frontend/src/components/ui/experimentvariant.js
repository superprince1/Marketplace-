import React from 'react';
import { useExperiment } from '../../context/ExperimentContext';

const ExperimentVariant = ({ experiment, variants, fallback }) => {
  const { variant, loading } = useExperiment(experiment);
  if (loading) return fallback || null;
  const matched = variants.find(v => v.name === variant);
  return matched ? matched.component : fallback;
};

export default ExperimentVariant;