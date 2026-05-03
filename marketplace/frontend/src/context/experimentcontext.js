import React, { createContext, useContext, useEffect, useState } from 'react';
import API from '../services/api';
import { v4 as uuidv4 } from 'uuid'; // run: npm install uuid

const ExperimentContext = createContext();

export const useExperiment = (experimentName) => {
  const context = useContext(ExperimentContext);
  if (!context) throw new Error('useExperiment must be used within ExperimentProvider');
  const [variant, setVariant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!context.experiments[experimentName]) {
      context.fetchExperiment(experimentName);
    } else {
      setVariant(context.experiments[experimentName]);
      setLoading(false);
    }
  }, [experimentName, context]);

  useEffect(() => {
    if (context.experiments[experimentName]) {
      setVariant(context.experiments[experimentName]);
      setLoading(false);
    }
  }, [context.experiments, experimentName]);

  const trackConversion = (metadata) => {
    API.post('/experiments/track', { experimentName, metadata });
  };

  return { variant, loading, trackConversion };
};

export const ExperimentProvider = ({ children }) => {
  const [experiments, setExperiments] = useState({});
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    let sid = localStorage.getItem('experiment_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('experiment_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  const fetchExperiment = async (name) => {
    try {
      const res = await API.get(`/experiments/${name}`, {
        headers: { 'X-Session-Id': sessionId },
      });
      const variant = res.data.variant;
      setExperiments(prev => ({ ...prev, [name]: variant }));
    } catch (err) {
      console.error(err);
      setExperiments(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <ExperimentContext.Provider value={{ experiments, fetchExperiment }}>
      {children}
    </ExperimentContext.Provider>
  );
};