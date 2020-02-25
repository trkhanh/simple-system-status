async function init() {
    const { format } = require('timeago.js');
    const dateTimeFormat = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: 'numeric' });

    const __HOST__ = 'https://cloud-api.directus.cloud/system/status/past';
    const __UPTIME__ = 'https://cloud-api.directus.cloud/system/uptime';
    const __LAST_RESPONSE__ = 'https://cloud-api.directus.cloud/system/status/last';

    const response = await fetch(__HOST__);

    const { data } = await response.json();

    const uptimeResponse = await fetch(__UPTIME__)
    const uptimeData = await uptimeResponse.json();
    const uptime = uptimeData.data.toFixed(2) + " % Uptime";

    const lastResponse = await fetch(__LAST_RESPONSE__);
    const lastData = await lastResponse.json();

    const lastStatus = lastData.data.status;
    const lastUpdated = format(new Date(lastData.data.datetime), 'en_US');

    document.querySelector('#current').classList.add(lastStatus + '-bg');
    document.querySelector('#cloud-spi-status').classList.add(lastStatus);
    document.querySelector('#cloud-asset-status').classList.add(lastStatus);
    document.querySelector('#date').innerText = 'Last updated: ' + lastUpdated;

    let allCopy = 'Unknown';
    let cloudCopy = 'Unknown';

    switch (lastStatus) {
        case 'red':
            allCopy = 'System Outage';
            cloudCopy = 'Outage';
            break;
        case 'yellow':
            allCopy = 'Degraded Performance';
            cloudCopy = 'Degraded Performance';
            break;
        case 'green':
            allCopy = 'All Systems Operational';
            cloudCopy = 'Operational';
            break;
    }

    document.querySelector('#current-status').innerText = allCopy;
    document.querySelector('#cloud-api-status').innerText = cloudCopy;
    document.querySelector('#cloud-asset-status').innerText = cloudCopy;

    document.body.classList.remove('loading');

    let incidentsHTML = '';
    let graphHTML = '';

    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = dateTimeFormat.format(date);
        const reportsInThisDay = data.filter(s => isInDate(new Date(s.datetime), date));

        incidentsHTML += getIncidentListItem(dateString, reportsInThisDay);

        let color = 'green';
        for (let i = 0; i < reportsInThisDay.length; i++) {
            const report = reportsInThisDay[i];
            if (report.status !== color && report.status !== 'green') color = report.status;

            // Stop looking for events, cause red is the worst that can happen
            if (color === 'red') break;
        }
        graphHTML += `<li class="${color}-bg" title="${dateString}"><a href="#${dateString}"></a></li>`;
    }

    document.querySelector('#past-incidents').innerHTML = incidentsHTML;
    document.querySelector('#graph').innerHTML = graphHTML;
    document.querySelector('#uptime').innerHTML = uptime;
}

init();

function getIncidentListItem(dateString, reportsInThisDay = []) {
    const timeFormat = new Intl.DateTimeFormat('default', { hour: 'numeric', minute: 'numeric', 'hour12': false });
    const dateTimeFormat = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', 'hour12': false });
    reportsInThisDay = reportsInThisDay.filter(({ status }) => status !== 'green');

    if (reportsInThisDay.length === 0) {
        return `
        <li>
          <h3><a name="${dateString}">${dateString}</a></h3>
          <p>No incidents reported</p>
        </li>
      `;
    }

    return `<li>
      <h3><a name="${dateString}">${dateString}</a></h3>
      <ul>
        ${
        reportsInThisDay
            .reduce((acc, { status, description, datetime, datetime_end }, index) => acc += `
            <li>
              <h4 class="${status}">
                ${status === 'red' ?
                    'Issues reported for the Directus Cloud API' :
                    'Latency reported for the Directus Cloud API'
                }
              </h4>
              <h5>${description || '<b>Resolved</b> — This incident has been resolved.'}</h5>
              <p>${dateTimeFormat.format(new Date(datetime))} ${datetime_end ? ' — ' + timeFormat.format(new Date(datetime_end)) : ''} UTC</p>
            </li>
            `,
                '')
        }
      </ul>
    </li>`
}

function isInDate(date1, date2) {
    return date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear();
}