import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Toast from 'react-native-toast-message';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Custom hook to manage attendance reminders.
 * @param user The logged-in user object (employee or sub-admin) which contains `schedule_in` and `schedule_out`.
 */
export function useAttendanceReminder(user: any) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    let pd: any = {};
    if (user.profile_data) {
      try {
        pd = typeof user.profile_data === 'string' ? JSON.parse(user.profile_data) : user.profile_data;
      } catch (e) {
        console.log("Error parsing profile_data in hook:", e);
      }
    }

    const scheduleIn = user.schedule_in || pd.shiftIn;
    const scheduleOut = user.schedule_out || pd.shiftOut;
    const breakIn = user.break_in || pd.breakStart;
    const breakOut = user.break_out || pd.breakEnd;

    if (!scheduleIn && !scheduleOut && !breakIn && !breakOut) return;

    if (Platform.OS === 'web') {
      setupWebReminder(scheduleIn, scheduleOut, breakIn, breakOut);
    } else {
      setupMobileReminder(scheduleIn, scheduleOut, breakIn, breakOut);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const cleanStr = timeStr.toLowerCase().trim();
    const isPm = cleanStr.includes('pm');
    const isAm = cleanStr.includes('am');
    const timeOnly = cleanStr.replace('am', '').replace('pm', '').trim();
    
    const parts = timeOnly.split(':');
    let hours = parts[0] ? parseInt(parts[0], 10) : 0;
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    
    if (isPm && hours < 12) {
      hours += 12;
    } else if (isAm && hours === 12) {
      hours = 0;
    }
    return { hours, minutes };
  };

  const setupWebReminder = (scheduleIn?: string, scheduleOut?: string, breakIn?: string, breakOut?: string) => {
    let reminderInMins = 0, reminderInHours = 0;
    let reminderOutMins = 0, reminderOutHours = 0;
    let reminderBreakInMins = 0, reminderBreakInHours = 0;
    let reminderBreakOutMins = 0, reminderBreakOutHours = 0;

    if (scheduleIn && scheduleOut) {
      const { hours: inHours, minutes: inMinutes } = parseTimeString(scheduleIn);
      const { hours: outHours, minutes: outMinutes } = parseTimeString(scheduleOut);

      reminderInMins = inMinutes - 15;
      reminderInHours = inHours;
      if (reminderInMins < 0) {
        reminderInMins += 60;
        reminderInHours -= 1;
      }
      if (reminderInHours < 0) reminderInHours += 24;

      reminderOutMins = outMinutes - 15;
      reminderOutHours = outHours;
      if (reminderOutMins < 0) {
        reminderOutMins += 60;
        reminderOutHours -= 1;
      }
      if (reminderOutHours < 0) reminderOutHours += 24;
    }

    if (breakIn && breakOut) {
      const { hours: bInHours, minutes: bInMinutes } = parseTimeString(breakIn);
      const { hours: bOutHours, minutes: bOutMinutes } = parseTimeString(breakOut);

      reminderBreakInMins = bInMinutes - 5;
      reminderBreakInHours = bInHours;
      if (reminderBreakInMins < 0) {
        reminderBreakInMins += 60;
        reminderBreakInHours -= 1;
      }
      if (reminderBreakInHours < 0) reminderBreakInHours += 24;

      reminderBreakOutMins = bOutMinutes - 5;
      reminderBreakOutHours = bOutHours;
      if (reminderBreakOutMins < 0) {
        reminderBreakOutMins += 60;
        reminderBreakOutHours -= 1;
      }
      if (reminderBreakOutHours < 0) reminderBreakOutHours += 24;
    }

    let hasAlertedIn = false;
    let hasAlertedOut = false;
    let hasAlertedBreakIn = false;
    let hasAlertedBreakOut = false;

    // Run initially
    checkWebAlarms();

    // Check every minute
    timerRef.current = setInterval(checkWebAlarms, 60000);

    function checkWebAlarms() {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();

      // Reset flags at midnight
      if (currentH === 0 && currentM === 0) {
        hasAlertedIn = false;
        hasAlertedOut = false;
        hasAlertedBreakIn = false;
        hasAlertedBreakOut = false;
      }

      if (scheduleIn && !hasAlertedIn && currentH === reminderInHours && currentM === reminderInMins) {
        hasAlertedIn = true;
        Toast.show({
          type: 'info',
          text1: 'Attendance Reminder',
          text2: `Your shift starts in 15 minutes! Don't forget to Check-in.`,
          position: 'top',
          visibilityTime: 10000,
        });
      }

      if (scheduleOut && !hasAlertedOut && currentH === reminderOutHours && currentM === reminderOutMins) {
        hasAlertedOut = true;
        Toast.show({
          type: 'info',
          text1: 'Attendance Reminder',
          text2: `Your shift ends in 15 minutes! Prepare to Check-out.`,
          position: 'top',
          visibilityTime: 10000,
        });
      }

      if (breakIn && !hasAlertedBreakIn && currentH === reminderBreakInHours && currentM === reminderBreakInMins) {
        hasAlertedBreakIn = true;
        Toast.show({
          type: 'info',
          text1: 'Break Reminder',
          text2: `Your break starts in 5 minutes! Don't forget to Break-in.`,
          position: 'top',
          visibilityTime: 10000,
        });
      }

      if (breakOut && !hasAlertedBreakOut && currentH === reminderBreakOutHours && currentM === reminderBreakOutMins) {
        hasAlertedBreakOut = true;
        Toast.show({
          type: 'info',
          text1: 'Break Reminder',
          text2: `Your break ends in 5 minutes! Prepare to Break-out.`,
          position: 'top',
          visibilityTime: 10000,
        });
      }
    }
  };

  const setupMobileReminder = async (scheduleIn?: string, scheduleOut?: string, breakIn?: string, breakOut?: string) => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log("Notifications permission not granted.");
      return;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('alarm-channel-v3', {
          name: 'Alarm Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'alarm',
        });
      } catch (e) {
        console.log("Error creating channel inside hook:", e);
      }
    }

    console.log(`Setting up mobile reminders. CheckIn: ${scheduleIn}, CheckOut: ${scheduleOut}, BreakIn: ${breakIn}, BreakOut: ${breakOut}`);

    // Cancel previously scheduled notifications to avoid duplicates
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.log("Error cancelling old notifications:", e);
    }

    // 1. Shift Check-in (15 mins before)
    if (scheduleIn) {
      const { hours: inHours, minutes: inMinutes } = parseTimeString(scheduleIn);
      let reminderInMins = inMinutes - 15;
      let reminderInHours = inHours;
      if (reminderInMins < 0) {
        reminderInMins += 60;
        reminderInHours -= 1;
      }
      if (reminderInHours < 0) reminderInHours += 24;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Attendance Reminder',
          body: `Your shift starts in 15 minutes! Don't forget to Check-in.`,
          sound: true,
        },
        trigger: {
          hour: reminderInHours,
          minute: reminderInMins,
          repeats: true,
          channelId: 'alarm-channel-v3'
        } as any,
      });
      console.log(`Scheduled Check-in alarm for ${reminderInHours}:${reminderInMins}`);
    }

    // 2. Shift Check-out (15 mins before)
    if (scheduleOut) {
      const { hours: outHours, minutes: outMinutes } = parseTimeString(scheduleOut);
      let reminderOutMins = outMinutes - 15;
      let reminderOutHours = outHours;
      if (reminderOutMins < 0) {
        reminderOutMins += 60;
        reminderOutHours -= 1;
      }
      if (reminderOutHours < 0) reminderOutHours += 24;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Attendance Reminder',
          body: `Your shift ends in 15 minutes! Prepare to Check-out.`,
          sound: true,
        },
        trigger: {
          hour: reminderOutHours,
          minute: reminderOutMins,
          repeats: true,
          channelId: 'alarm-channel-v3'
        } as any,
      });
      console.log(`Scheduled Check-out alarm for ${reminderOutHours}:${reminderOutMins}`);
    }

    // 3. Break-in (5 mins before)
    if (breakIn) {
      const { hours: bInHours, minutes: bInMinutes } = parseTimeString(breakIn);
      let reminderBreakInMins = bInMinutes - 5;
      let reminderBreakInHours = bInHours;
      if (reminderBreakInMins < 0) {
        reminderBreakInMins += 60;
        reminderBreakInHours -= 1;
      }
      if (reminderBreakInHours < 0) reminderBreakInHours += 24;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Break Reminder',
          body: `Your break starts in 5 minutes! Don't forget to Break-in.`,
          sound: true,
        },
        trigger: {
          hour: reminderBreakInHours,
          minute: reminderBreakInMins,
          repeats: true,
          channelId: 'alarm-channel-v3'
        } as any,
      });
      console.log(`Scheduled Break-in alarm for ${reminderBreakInHours}:${reminderBreakInMins}`);
    }

    // 4. Break-out (5 mins before)
    if (breakOut) {
      const { hours: bOutHours, minutes: bOutMinutes } = parseTimeString(breakOut);
      let reminderBreakOutMins = bOutMinutes - 5;
      let reminderBreakOutHours = bOutHours;
      if (reminderBreakOutMins < 0) {
        reminderBreakOutMins += 60;
        reminderBreakOutHours -= 1;
      }
      if (reminderBreakOutHours < 0) reminderBreakOutHours += 24;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Break Reminder',
          body: `Your break ends in 5 minutes! Prepare to Break-out.`,
          sound: true,
        },
        trigger: {
          hour: reminderBreakOutHours,
          minute: reminderBreakOutMins,
          repeats: true,
          channelId: 'alarm-channel-v3'
        } as any,
      });
      console.log(`Scheduled Break-out alarm for ${reminderBreakOutHours}:${reminderBreakOutMins}`);
    }
  };
}
