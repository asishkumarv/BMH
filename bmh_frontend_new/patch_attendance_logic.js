const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Fix fetch URL
c = c.replace(
  /https:\/\/napi\.bharatmedicalhallplus\.com\/attendance\/today\/\$\{empId\}/,
  'https://napi.bharatmedicalhallplus.com/attendance/employee-dashboard/${empId}'
);

// 2. Fix handleCapture break logic
const handleCaptureTarget = `    const handleCapture = async () => {
      if (!cameraRef.current) return;
      try {
        setLoadingAction(true);
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        
        const location = await Location.getCurrentPositionAsync({});
        const payload: any = {
          employeeId: user.id,
          image: photo.base64,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        
        payload.action = actionType;
        const res = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-face', payload);
        
        if (res.data.success) {
          setCameraMessage({ text: res.data.message, type: 'success' });
          setTimeout(() => setCameraVisible(false), 2000);
        } else {
          setCameraMessage({ text: res.data.message, type: 'error' });
        }
        fetchSummary(user.id);
      } catch (error: any) {`;

const handleCaptureReplacement = `    const handleCapture = async () => {
      if (!cameraRef.current) return;
      try {
        setLoadingAction(true);
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        
        const location = await Location.getCurrentPositionAsync({});
        const payload: any = {
          employeeId: user.id,
          image: photo.base64,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        
        if (actionType === 'login' || actionType === 'logout') {
          payload.action = actionType;
          const res = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-face', payload);
          if (res.data.success) {
            setCameraMessage({ text: res.data.message, type: 'success' });
            setTimeout(() => setCameraVisible(false), 2000);
          } else {
            setCameraMessage({ text: res.data.message, type: 'error' });
          }
        } else {
          payload.breakType = actionType === 'break_in' ? 'Break In' : 'Break Out';
          const breakRes = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/break', payload);
          if (breakRes.data.success) {
             setCameraMessage({ text: breakRes.data.message, type: 'success' });
             setTimeout(() => setCameraVisible(false), 2000);
          } else {
             setCameraMessage({ text: breakRes.data.message, type: 'error' });
          }
        }
        fetchSummary(user.id);
      } catch (error: any) {`;

c = c.replace(handleCaptureTarget, handleCaptureReplacement);

fs.writeFileSync(file, c);
console.log('Fixed API endpoints for attendance state and breaks!');
