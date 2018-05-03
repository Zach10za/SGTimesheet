// Fetch week's entries from the database
const getWeekInfo = (cb) => {
    fetch('https://kz7jvrkz59.execute-api.us-west-1.amazonaws.com/dev/SGTimesheet/?time=week')
    .then(response => response.json())
    .then(result => result.WEEK)
    .then(cb)
    .catch (err => console.log("FETCH ERROR:", err));
}
// Fetch today's entries from the database
const getTodayInfo = (cb) => {
    fetch('https://kz7jvrkz59.execute-api.us-west-1.amazonaws.com/dev/SGTimesheet/?time=today')
    .then(response => response.json())
    .then(result => result.TODAY)
    .then(cb)
    .catch (err => console.log("FETCH ERROR:", err));
}

// Get the current 'work hour'
const getCurrentHour = () => {
    const date = new Date();
    date.setTime(date.getTime() - (60000 * 5));
    const hours = date.getHours();
    let hour = hours - 8;
    if (hours > 13) hour = hours - 9;
    return hour;
}

// Get the current day
const getCurrentDay = () => {
    const date = new Date();
    const day = date.getDay();
    return day - 1 ;
}

// Move the triangle selector to the correct hour position and load previous data from state into the form
const moveSelector = (day = 0, hour = 1) => {
    chrome.storage.sync.get(['state'], (result) => {
        let selectedHour = {}
        document.querySelectorAll('ul.hour-list li').forEach(node => {
            if (node.classList) node.classList.remove('active', 'success');
        });
        const hourList = document.querySelector('ul.hour-list');
        result.state.week[day].hours.forEach(h => {
            hourList.querySelector(`[data-index='${h.hour}']`).classList.add('success');
            if (h.hour === hour) {
                selectedHour = h;
            };
        });

        const hourTop = (hour - 1) * 25 + 34 + "px";
        const dayTop = day * 40 + 34 + "px";

        document.getElementById('hour').value = hour;
        document.getElementById('task').value = selectedHour.task || "";
        const submitBtn = document.getElementById('submit');
        if (selectedHour.id) {
            submitBtn.classList.add('update');
            submitBtn.innerHTML = "Update timesheet entry";
            document.getElementById('project').value = selectedHour.project;
        } else {
            submitBtn.classList.remove('update');
            submitBtn.innerHTML = "Add to timesheet";
            document.getElementById('project').value = "";
        }
        document.getElementById('daySelector').style.top = dayTop;
        document.getElementById('hourSelector').style.top = hourTop;

    });
}

// Update the styling of the popup based on the state
const update = () => {
    chrome.storage.sync.get(['state'], (result) => {
        let state = result.state;
        const currentHour = getCurrentHour();
        const currentDay = getCurrentDay();
        let week = state.week;
        const dayList = document.querySelectorAll('ul.day-list li');
        dayList.forEach((node, index) => {
            if (week[index] && week[index].hours) node.querySelector('div[class^="progress-"]').className = `progress-${week[index].hours.length}`;
        });
        moveSelector(state.selected.day, state.selected.hour);
    });
}

// Hijack the submit button and send XMLHttpRequest
const submitButton = document.getElementById('submit');
submitButton.addEventListener('click', function(e) {
    e.preventDefault();
    submitHour();
});
const submitHour = () => {
    hour = parseInt(document.getElementById('hour').value, 10);
    project = document.getElementById('project').value || 1000;
    task = document.getElementById('task').value || "Programming";
    chrome.storage.sync.get(['state'], (result) => {
        const state = result.state;
        const date = state.selected.date;
        const xhr = new XMLHttpRequest();

        let method = "POST";
        let params = `hour=${hour}&project=${project}&task=${task}&date=${date}`;
        // Check if entry for this hour already exists. If so, send PATCH request
        state.week[state.selected.day].hours.some((h) => {
            if (hour === h.hour) {
                method = "PATCH";
                params = `id=${h.id}&project=${project}&task=${task}`;
                return true;
            }
        });
        xhr.open(method, "https://kz7jvrkz59.execute-api.us-west-1.amazonaws.com/dev/SGTimesheet/");
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => {
            if(xhr.readyState == 4 && xhr.status == 200) {
                state.week = [{hours:[]},{hours:[]},{hours:[]},{hours:[]},{hours:[]}];
                getWeekInfo((week) => {
                    week.forEach(h => {
                        state.week[h.day-2].hours.push(h);
                        if (!state.week[h.day-2].date) state.week[h.day-2].date = h.date;
                    });
                    chrome.storage.sync.set({ state }, update);
                });
            }
        }
        xhr.send(params);
    });
}

// Run this funtion on load
// Checks for existing/up-to-date state then updates the popup
(function() {
    chrome.storage.sync.get(['state'], (result) => {
        let state = {};
        if (result && result.state && state.date === new Date().toDateString())  {
            state = result.state;
        } else {
            state.date = new Date().toDateString();
            state.week = [{hours:[]},{hours:[]},{hours:[]},{hours:[]},{hours:[]}];
            state.selected = {
                day: getCurrentDay(),
                hour: getCurrentHour(),
                date: new Date().toISOString().substring(0, 10),
            };
            getWeekInfo((week) => {
                week.forEach(hour => {
                    state.week[hour.day-2].hours.push(hour);
                    if (!state.week[hour.day-2].date) state.week[hour.day-2].date = hour.date;
                });
                chrome.storage.sync.set({ state }, update);
            });
        }
        
    });
}())


const dayList = document.querySelectorAll('ul.day-list li');
dayList.forEach((node, index) => {
    node.addEventListener('click', () => {
        chrome.storage.sync.get(['state'], (result) => {
            let state = result.state;
            state.selected.day = parseInt(node.dataset.index-1,10);
            moveSelector(state.selected.day, state.selected.hour);
            let date = new Date();
            date.setDate(date.getDate() + state.selected.day - getCurrentDay());
            state.selected.date = date.toISOString().substring(0, 10);
            chrome.storage.sync.set({ state });
        });
    });
});

const hourList = document.querySelectorAll('ul.hour-list li');
hourList.forEach((node, index) => {
    node.addEventListener('click', () => {
        chrome.storage.sync.get(['state'], (result) => {
            let state = result.state;
            state.selected.hour = parseInt(node.dataset.index,10);
            moveSelector(state.selected.day, state.selected.hour);
            chrome.storage.sync.set({ state });
        });
    })
});