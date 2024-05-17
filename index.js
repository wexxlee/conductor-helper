const _CMD_PREFIX = '/coord';
const _ECHO_PREFIX = '/e';
const _MAX_LINES_PER_MACRO = 15;
let lastClickedButton = null;
function generateMacro() {
    clearOutput();

    const regex = {
        siren: /\(Maybe:\s*(?<mark>[^)]+)\)\s*.(?<zone>[\w ]+)\s*\(\s*(?<x>[0-9\.]+)\s*,\s*(?<y>[0-9\.]+)\s*\)/,
        prime: /(?<mark>[^(]+)\s+\((?<x>[0-9\.]+)\s*,\s*(?<y>[0-9\.]+)\s*\)/,
        primeZoneOnly: /^(?<zone>[\w\'\- ]+)$/,
        bear: /(?<zone>[\w ]+)\s+\(\s*(?<x>[0-9\.]+)\s*,\s*(?<y>[0-9\.]+)\s*\)\s*(?<mark>[\w ]+)/,
    }

    const scoutSelect = document.querySelector('input[name="tool"]:checked');
    if (!scoutSelect) {
        displayError('Must select scouting tool.');
        return;
    }
    const scoutSrc = scoutSelect.value;
    const scoutRegex = regex[scoutSrc];
    if (!scoutRegex) {
        displayError('Invalid scout source');
        return;
    }
    const scoutMarks = document.getElementById('marks').value.split('\n');
    if (scoutMarks.length < 2) {
        displayError('Not enough marks (min. 2)');
        return;
    }

    const includeZoneName = document.getElementById('includeZoneName').checked;
    const includeMarkName = document.getElementById('includeMarkName').checked;

    let trainName = document.getElementById('trainName').value;
    trainName = trainName === '' ? 'My Train' : trainName;
    const trainHeader = `/e &nbsp;&nbsp;&nbsp;&nbsp;${trainName.toUpperCase()}&nbsp;&nbsp;&nbsp;&nbsp;`

    const output = [trainHeader];
    let zoneName = '';
    let zoneMarkCount = 0;
    let zoneMarkCoordCache = [];
    let zoneMarkNameCache = [];

    // TODO: Add support for multiple instances (need to confirm output format from scout tools).
    for (const mark of scoutMarks) {
        if (mark.length < 3) // probably a newline
            continue;

        // if using prime, new zones will appear on a line by themselves
        // so we need to use a different regex to detect the change in zone,
        // and based on that, dump the previous zone's cached marks into `output`.
        if (scoutSrc === 'prime') {
            const zoneTestMatch = mark.match(regex.primeZoneOnly);
            if (zoneTestMatch) {
                // this could be the beginning of a new zone, or it could be
                // an inadvertent header row that was copied (e.g. 'Endwalker').
                // If MarkCount=0, that means we cached no marks for the last zone, so just
                // set the new zone and move on.  If we do have cached marks, process the prior zone.
                if (zoneMarkCount > 0) {
                    const zoneHeader = getHeaderLine(zoneName, includeZoneName, zoneMarkNameCache, includeMarkName);
                    if (zoneHeader)
                        output.push(zoneHeader);
                    output.push(...zoneMarkCoordCache);
                }
                zoneMarkCount = 0;
                zoneMarkCoordCache = [];
                zoneMarkNameCache = [];
                zoneName = zoneTestMatch.groups.zone;
                continue;
            }
        }

        const match = mark.match(scoutRegex);
        const markName = (match?.groups?.mark ?? '').trim();
        const x = match?.groups?.x;
        const y = match?.groups?.y;
        const nonPrimeZoneName = match?.groups?.zone;

        // handle output of previous zone here for non-prime scouts
        if (
            scoutSrc !== 'prime' &&
            zoneName !== '' &&
            nonPrimeZoneName &&
            zoneName !== nonPrimeZoneName
        ) {
            const zoneHeader = getHeaderLine(zoneName, includeZoneName, zoneMarkNameCache, includeMarkName);
            if (zoneHeader)
                output.push(zoneHeader);
            output.push(...zoneMarkCoordCache);
            zoneMarkCount = 0;
            zoneMarkCoordCache = [];
            zoneMarkNameCache = [];
        }

        if (scoutSrc !== 'prime')
            zoneName = nonPrimeZoneName;

        if (!markName || !x || !y || !zoneName) {
            displayError(`Invalid mark format: ${mark}.  Is the correct scouting tool selected?`);
            continue;
        }

        zoneMarkCount++;
        zoneMarkNameCache.push(markName);
        zoneMarkCoordCache.push(`${_CMD_PREFIX} ${x} ${y} : ${zoneName}`);
    }

    // push the final zone's marks, since the loop has ended
    if (zoneMarkCount > 0) {
        const zoneHeader = getHeaderLine(zoneName, includeZoneName, zoneMarkNameCache, includeMarkName);
        if (zoneHeader)
            output.push(zoneHeader);
        output.push(...zoneMarkCoordCache);
    }

    displayMacro(output);
}

function getHeaderLine(zoneName, includeZone, markNames, includeMarks) {
    if (!includeZone && !includeMarks)
        return;

    let headerEcho = `${_ECHO_PREFIX}  `;
    if (includeZone)
        headerEcho += includeMarks ? `${zoneName}: ` : `${zoneName} `;
    if (includeMarks)
        headerEcho += `[${markNames.join(' → ')}] `;

    return headerEcho;
 }

function displayMacro(output) {
    if (output.length <= 1) {
        displayError('No macro generated.');
        return;
    }
    document.getElementById('macroHeader').style.visibility = 'visible';
    document.getElementById('macroContainer').innerHTML = getFormattedMacro(output);    
}

function getFormattedMacro(output) {
    let brokenOutput = '';
    for (let i = 0; i < output.length; i++) {
        if (i % _MAX_LINES_PER_MACRO === 0) {
            if (i !== 0) {
                brokenOutput += '</div>';
            }
            brokenOutput += `<div class="macroText"><button class="copyButton" onclick="copyToClipboard(this)">Copy to Clipboard</button>`;
        }
        brokenOutput += output[i];
        if ((i + 1) % _MAX_LINES_PER_MACRO !== 0 || i !== output.length - 1)
            brokenOutput += '<br />\n';
    }
    brokenOutput += '</div>';
    return brokenOutput;
}

function copyToClipboard(button) {
    if (lastClickedButton)
        lastClickedButton.innerHTML = 'Copy to Clipboard';

    let text = button.parentNode.textContent.replace('Copy to Clipboard', '');
    navigator.clipboard.writeText(text).then(function () {
        button.innerHTML = '<span style="color:green;">&#10004;</span> Copied!';
        lastClickedButton = button;
    }, function (err) {
        displayError('Could not copy text: ', err);
    });
}

function clearOutput() {
    document.getElementById('errorText').innerHTML = '';
    document.getElementById('macroContainer').innerHTML = '';
    document.getElementById('errorHeader').style.visibility = 'hidden';
    document.getElementById('macroHeader').style.visibility = 'hidden';
  }
function displayError(msg) {
    document.getElementById('errorHeader').style.visibility = 'visible';
    document.getElementById('errorText').innerHTML += `Error: ${msg}<br />`;
 }