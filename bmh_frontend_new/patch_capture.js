const fs = require('fs');
const file = 'c:/Users/Lohitha Asish/Desktop/BMH/bmh_frontend_new/app/delivery/dashboard/index.tsx';
let c = fs.readFileSync(file, 'utf8');

const target = `  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      setLoadingAction(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      const location = await Location.getCurrentPositionAsync({});
      
      const payload: any = {
        employee_id: user.id,
        image: \`data:image/jpeg;base64,\${photo.base64}\`,
        lat: location.coords.latitude,
        lng: location.coords.longitude
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
    } catch (error: any) {
      setCameraMessage({ text: error.response?.data?.message || "Something went wrong.", type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };`;

const replacement = `  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setLoadingAction(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      const location = await Location.getCurrentPositionAsync({});

      // Verify Location first
      const locRes = await axios.post('https://napi.bharatmedicalhallplus.com/attendance/verify-location', {
        employeeId: user.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const isLocationVerified = locRes.data.success && locRes.data.locationVerified;
      
      if (!isLocationVerified && (actionType === 'login' || actionType === 'logout')) {
         setCameraMessage({ text: locRes.data.message || "Outside allowed area.", type: 'error' });
         setLoadingAction(false);
         return;
      }

      const payload: any = {
        base64Image: photo.base64,
        employeeId: user.id,
        locationVerified: isLocationVerified
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
    } catch (error: any) {
      setCameraMessage({ text: error.response?.data?.message || "Something went wrong.", type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };`;

c = c.replace(target, replacement);

fs.writeFileSync(file, c);
console.log('Capture logic patched!');
