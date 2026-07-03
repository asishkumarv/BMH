import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'ecogreen_api_key';
const TOKEN_TIME_KEY = 'ecogreen_api_key_time';
const THREE_HOURS = 3 * 60 * 60 * 1000;

export function useTokenManager() {
  const [apiKey, setApiKey] = useState(null);

  useEffect(() => {
    const fetchAndCheckToken = async () => {
      let storedKey, storedTime;
      if (Platform.OS === 'web') {
        storedKey = localStorage.getItem(TOKEN_KEY);
        storedTime = localStorage.getItem(TOKEN_TIME_KEY);
      } else {
        storedKey = await AsyncStorage.getItem(TOKEN_KEY);
        storedTime = await AsyncStorage.getItem(TOKEN_TIME_KEY);
      }

      const now = Date.now();
      if (storedKey && storedTime && (now - parseInt(storedTime, 10) < THREE_HOURS)) {
        setApiKey(storedKey);
      } else {
        await generateToken();
      }
    };

    fetchAndCheckToken();

    // Set up an interval to refresh the token every 3 hours while the app is open
    const interval = setInterval(() => {
      generateToken();
    }, THREE_HOURS);

    return () => clearInterval(interval);
  }, []);

  const generateToken = async () => {
    try {
      const res = await fetch('http://117.211.64.158:21000/ws_c2_services_generate_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          c2Code: "P00000",
          storeId: "001",
          prodCode: "02",
          securityKey: "VURBd01ESXdNakU9"
        })
      });
      const data = await res.json();
      
      // Handle the exact structure based on what the API returns. We assume 'data.apiKey' or similar.
      const key = data.apiKey || data.data?.apiKey || data.data || data; 
      
      if (key && typeof key === 'string') {
        const now = Date.now().toString();
        
        if (Platform.OS === 'web') {
          localStorage.setItem(TOKEN_KEY, key);
          localStorage.setItem(TOKEN_TIME_KEY, now);
        } else {
          await AsyncStorage.setItem(TOKEN_KEY, key);
          await AsyncStorage.setItem(TOKEN_TIME_KEY, now);
        }
        
        setApiKey(key);
      }
    } catch (err) {
      console.error('Failed to generate token:', err);
    }
  };

  return apiKey;
}
