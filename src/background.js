
const notificationOptions = {
  iconUrl: "./icons/icon48.png",
  type: 'basic',
  title: "SG Timesheet",
  message: 'Remember to update your timesheet.',
  priority: 1,
};

const alarmOptions = {
  when: Math.ceil(Date.now() / 1000 / 60 / 60) * 60 * 60 * 1000, // start alarm at the next hour
  periodInMinutes: 60 // send notification every hour
};

// Create a notification that displays the timesheet progress every hour
chrome.alarms.create('alarm', alarmOptions)
chrome.alarms.onAlarm.addListener(function() {
  chrome.storage.sync.get(['state'], function(result) {
    if (result.state && result.state.hours) {
      notificationOptions.title = `${result.state.hours.length} / 8 recorded today`;
      // Only send notification if the days timesheet is not complete
      if (result.state.hours.length != 8) {
        chrome.notifications.create('notify', notificationOptions, function(id) {
          chrome.notifications.onClicked.addListener(function() {
            chrome.notifications.clear(id);
          });
        });
      }
      }
    });
});

