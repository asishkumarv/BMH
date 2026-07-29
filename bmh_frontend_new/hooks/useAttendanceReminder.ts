import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';


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
  useEffect(() => {
    // Clear any existing local alarms/scheduled notifications
    Notifications.cancelAllScheduledNotificationsAsync().catch(err => {
      console.log("Error cancelling scheduled notifications:", err);
    });
  }, [user]);
}
