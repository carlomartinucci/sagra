import { useState, useEffect } from 'react';

const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        const wakeLock = await navigator.wakeLock.request('screen');
        setWakeLock(wakeLock);
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };
    requestWakeLock();
    return () => wakeLock?.release();
  }, [wakeLock]);

  return wakeLock;
};

export default useWakeLock;
