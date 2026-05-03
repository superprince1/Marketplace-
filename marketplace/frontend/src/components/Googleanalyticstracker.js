import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const GoogleAnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Send pageview with the current path
    ReactGA.send({
      hitType: 'pageview',
      page: location.pathname + location.search,
      title: document.title,
    });
  }, [location]);

  return null;
};

export default GoogleAnalyticsTracker;