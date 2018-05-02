
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

// Move the triangle selector to the correct hour position and load previous data from state into the form
const moveSelector = (pos = 1) => {
    chrome.storage.sync.get(['state'], (result) => {
        let hour = {}
        result.state.hours.some(h => {
            if (h.hour === pos) {
                hour = h;
                return true;
            };
        });
        const top = pos * 22 + 12 + "px";
        document.getElementById('hour').value = pos;
        document.getElementById('task').value = hour.task || "";
        const submitBtn = document.getElementById('submit');
        if (hour.id) {
            submitBtn.classList.add('update');
            submitBtn.innerHTML = "Update timesheet entry";
            document.getElementById('project').value = hour.project;
        } else {
            submitBtn.classList.remove('update');
            submitBtn.innerHTML = "Add to timesheet";
            document.getElementById('project').value = "";
        }
        document.querySelector('.selector').style.top = top;
    });
}

// Update the styling of the popup based on the state
const update = () => {
    chrome.storage.sync.get(['state'], (result) => {
        let today = result.state.hours;
        const hourList = document.querySelectorAll('ul.hour-list li');
        const currentHour = getCurrentHour();
        hourList.forEach((node, index) => {
            if (node.classList) node.classList.remove('active', 'success');
            for (let i=0; i<today.length; i++) {
                if (today[i] && today[i].hour === index + 1) {
                    node.classList.add('success');
                }
            }
            if (index === currentHour - 1) {
                node.classList.add('active');
            }
            node.addEventListener('click', () => {
                moveSelector(parseInt(node.dataset.index,10));
            })
        });
        moveSelector(currentHour);
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
        const date = new Date(state.date).toISOString().substring(0, 10);
        const xhr = new XMLHttpRequest();

        let method = "POST";
        let params = `hour=${hour}&project=${project}&task=${task}&date=${date}`;
        // Check if entry for this hour already exists. If so, send PATCH request
        state.hours.some((h) => {
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
                getTodayInfo((today) => {
                    state.hours = today;
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
        if (result && result.state)  {
            state = result.state;
            if (state.date !== new Date().toDateString()) {
                state.date = new Date().toDateString();
                getTodayInfo((today) => {
                    state.hours = today;
                    chrome.storage.sync.set({ state }, update);
                });
            } else {
                update();
            }
        } else {
            state.date = new Date().toDateString();
            getTodayInfo((today) => {
                state.hours = today;
                chrome.storage.sync.set({ state }, update);
            });
        }
    });
}())