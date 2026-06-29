import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Toast from 'react-native-toast-message';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    if (!user || !user.schedule_in || !user.schedule_out) return;

    if (Platform.OS === 'web') {
      setupWebReminder(user.schedule_in, user.schedule_out);
    } else {
      setupMobileReminder(user.schedule_in, user.schedule_out);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  const parseTimeString = (timeStr: string) => {
    // Expects "HH:mm"
    const parts = timeStr.split(':');
    const hours = parts[0] ? parseInt(parts[0], 10) : 0;
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    return { hours, minutes };
  };

  const setupWebReminder = (scheduleIn: string, scheduleOut: string) => {
    const { hours: inHours, minutes: inMinutes } = parseTimeString(scheduleIn);
    const { hours: outHours, minutes: outMinutes } = parseTimeString(scheduleOut);

    // Calculate 15 mins before
    let reminderInMins = inMinutes - 15;
    let reminderInHours = inHours;
    if (reminderInMins < 0) {
      reminderInMins += 60;
      reminderInHours -= 1;
    }
    if (reminderInHours < 0) reminderInHours += 24;

    let reminderOutMins = outMinutes - 15;
    let reminderOutHours = outHours;
    if (reminderOutMins < 0) {
      reminderOutMins += 60;
      reminderOutHours -= 1;
    }
    if (reminderOutHours < 0) reminderOutHours += 24;

    // We only want to alert once per day for each
    let hasAlertedIn = false;
    let hasAlertedOut = false;

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
      }

      if (!hasAlertedIn && currentH === reminderInHours && currentM === reminderInMins) {
        hasAlertedIn = true;
        Toast.show({
          type: 'info',
          text1: 'Attendance Reminder',
          text2: `Your shift starts in 15 minutes! Don't forget to Check-in.`,
          position: 'top',
          visibilityTime: 10000,
        });
      }

      if (!hasAlertedOut && currentH === reminderOutHours && currentM === reminderOutMins) {
        hasAlertedOut = true;
        Toast.show({
          type: 'info',
          text1: 'Attendance Reminder',
          text2: `Your shift ends in 15 minutes! Prepare to Check-out.`,
          position: 'top',
          visibilityTime: 10000,
        });
      }
    }
  };

  const setupMobileReminder = async (scheduleIn: string, scheduleOut: string) => {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const { hours: inHours, minutes: inMinutes } = parseTimeString(scheduleIn);
    const { hours: outHours, minutes: outMinutes } = parseTimeString(scheduleOut);

    // Cancel previously scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 15 mins before check-in
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
        type: 'calendar',
        hour: reminderInHours,
        minute: reminderInMins,
        repeats: true,
      } as any,
    });

    // 15 mins before check-out
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
        type: 'calendar',
        hour: reminderOutHours,
        minute: reminderOutMins,
        repeats: true,
      } as any,
    });
  };
}
