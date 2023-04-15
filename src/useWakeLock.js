import { useState, useEffect } from 'react';

const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState(null);
  const [requestInProgress, setRequestInProgress] = useState(false);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (requestInProgress) return;
      setRequestInProgress(true);
      try {
        const wakeLock = await navigator.wakeLock.request('screen');
        setWakeLock(wakeLock);
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      } finally {
        setRequestInProgress(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      wakeLock?.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wakeLock, requestInProgress]);

  return wakeLock;
};

export default useWakeLock;
