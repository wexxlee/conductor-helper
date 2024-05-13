
function generateMacro() {
    clearOutput();

    const _PREFIX = '/coord';
    const regex = {
        siren: /\(Maybe:\s*(?<mark>[^)]+)\)\s*.(?<zone>[\w ]+)\s*\(\s*(?<x>[0-9\.]+)\s*,\s*(?<y>[0-9\.]+)\s*\)/,
        prime: /(?<mark>[\w ]+)\s+\((?<x>[0-9\.]+)\s*,\s*(?<y>[0-9\.]+)\s*\)/,
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

    let trainName = document.getElementById('trainName').value;
    trainName = trainName === '' ? 'My Train' : trainName;
    const trainHeader = `/e &nbsp;&nbsp;&nbsp;&nbsp;${trainName.toUpperCase()}&nbsp;&nbsp;&nbsp;&nbsp;`

    let output = '';
    let zoneName = '';
    let errors = '';
    for (const mark of scoutMarks) {
        if (mark.length < 3) // probably a newline
            continue;
        if (scoutSrc === 'prime') { // needs special handling
            const zoneTestRegex = /^(?<zone>[\w\'\- ]+)$/;
            const zoneTestMatch = mark.match(zoneTestRegex);
            if (zoneTestMatch) {
                zoneName = zoneTestMatch.groups.zone;
                continue;
            }
        }
        const match = mark.match(scoutRegex);
        const markName = match?.groups?.mark;
        const x = match?.groups?.x;
        const y = match?.groups?.y;
        if (scoutSrc !== 'prime')
            zoneName = match?.groups?.zone;
        if (!markName || !x || !y || !zoneName) {
            displayError(`Invalid mark format: ${mark}.  Is the correct scouting tool selected?`);
            continue;
        }
        output += `${_PREFIX} ${x} ${y} : ${zoneName}<br \>`;
    }

    displayMacro(trainHeader, output);
}

function displayMacro(trainHeader, output) {
    if (output === '') {
        displayError('No macro generated.');
        return;
    }
    document.getElementById('macroHeader').style.visibility = 'visible';
    document.getElementById('macroText').innerHTML = `${trainHeader}<br />${output}`;    
}

function clearOutput() {
    document.getElementById('errorText').innerHTML = '';
    document.getElementById('macroText').innerHTML = '';
    document.getElementById('errorHeader').style.visibility = 'hidden';
    document.getElementById('errorHeader').style.visibility = 'hidden';
  }
function displayError(msg) {
    document.getElementById('errorHeader').style.visibility = 'visible';
    document.getElementById('errorText').innerHTML += `Error: ${msg}<br>`;
 }